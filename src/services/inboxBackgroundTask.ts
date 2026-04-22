import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { env } from "@/services/env";
import { runMultiProviderInboxScan, requestServerScanFallback } from "@/services/prooofApi";
import type { EmailProviderId } from "@/types/domain";

const BACKGROUND_TASK_NAME = "prooof-inbox-background-scan";
const BACKGROUND_CONTEXT_KEY = "prooof.backgroundScan.context";
const DEFAULT_PROVIDERS: EmailProviderId[] = [
  "gmail",
  "yahoo",
  "outlook",
  "office365",
  "exchange",
  "work-imap",
];

type BackgroundContext = {
  userId: string;
  providers: EmailProviderId[];
};

function isEmailProviderId(value: string): value is EmailProviderId {
  return DEFAULT_PROVIDERS.includes(value as EmailProviderId);
}

async function readBackgroundContext(): Promise<BackgroundContext | null> {
  const raw = await AsyncStorage.getItem(BACKGROUND_CONTEXT_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as {
      userId?: unknown;
      providers?: unknown;
    };
    if (typeof parsed.userId !== "string" || parsed.userId.trim().length === 0) {
      return null;
    }
    const providers = Array.isArray(parsed.providers)
      ? parsed.providers.filter((value): value is EmailProviderId => typeof value === "string" && isEmailProviderId(value))
      : [];
    return {
      userId: parsed.userId,
      providers: providers.length > 0 ? providers : DEFAULT_PROVIDERS,
    };
  } catch {
    return null;
  }
}

if (!TaskManager.isTaskDefined(BACKGROUND_TASK_NAME)) {
  TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
    const context = await readBackgroundContext();
    if (!context) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    try {
      await runMultiProviderInboxScan(context.userId, context.providers);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
      if (env.serverScanFallbackEnabled) {
        try {
          await requestServerScanFallback(context.userId, context.providers);
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch {
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      }
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function setBackgroundScanContext(userId: string, providers: EmailProviderId[]) {
  const payload: BackgroundContext = {
    userId,
    providers: providers.length > 0 ? providers : DEFAULT_PROVIDERS,
  };
  await AsyncStorage.setItem(BACKGROUND_CONTEXT_KEY, JSON.stringify(payload));
}

export async function clearBackgroundScanContext() {
  await AsyncStorage.removeItem(BACKGROUND_CONTEXT_KEY);
}

export async function registerInboxBackgroundTask() {
  if (!env.backgroundInboxTaskEnabled) {
    return;
  }
  const registration = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
  if (registration) {
    return;
  }
  await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
    minimumInterval: env.backgroundInboxTaskIntervalSeconds,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterInboxBackgroundTask() {
  const registration = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
  if (registration) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
  }
}
