import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "@/theme/colors";

export type ReceiptImageSelectionPayload = {
  base64Image: string;
  fileName?: string;
  mimeType?: string;
};

type ReceiptImageDropZoneProps = {
  disabled?: boolean;
  onSelectImage: (payload: ReceiptImageSelectionPayload) => Promise<void> | void;
};

function stripDataUriPrefix(value: string): string {
  const index = value.indexOf(",");
  if (value.startsWith("data:") && index >= 0) {
    return value.slice(index + 1);
  }
  return value;
}

function getMimeTypeFromName(fileName?: string): string {
  if (!fileName) return "image/png";
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}

export function ReceiptImageDropZone({ disabled = false, onSelectImage }: ReceiptImageDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const readWebFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setLocalError("Please upload an image file (PNG/JPG/WebP).");
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => setLocalError("Could not read selected image.");
      reader.onload = async () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const base64Image = stripDataUriPrefix(result);
        if (!base64Image) {
          setLocalError("Could not decode selected image.");
          return;
        }
        await onSelectImage({
          base64Image,
          fileName: file.name,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    },
    [onSelectImage],
  );

  const onPickImage = useCallback(async () => {
    if (disabled) return;
    setLocalError(null);
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setLocalError("Photo access is required to upload receipt screenshots.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
      base64: true,
      selectionLimit: 1,
    });
    if (result.canceled || !result.assets?.[0]) {
      return;
    }
    const asset = result.assets[0];
    if (!asset.base64) {
      setLocalError("Could not load selected image.");
      return;
    }
    await onSelectImage({
      base64Image: asset.base64,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? getMimeTypeFromName(asset.fileName ?? undefined),
    });
  }, [disabled, onSelectImage]);

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.dropZone, isDragOver && styles.dropZoneActive, disabled && styles.dropZoneDisabled]}
        {...(Platform.OS === "web"
          ? ({
              onDragOver: (event: { preventDefault: () => void; stopPropagation: () => void }) => {
                event.preventDefault();
                event.stopPropagation();
                if (!disabled) setIsDragOver(true);
              },
              onDragLeave: (event: { preventDefault: () => void; stopPropagation: () => void }) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDragOver(false);
              },
              onDrop: async (event: {
                preventDefault: () => void;
                stopPropagation: () => void;
                dataTransfer?: { files?: FileList | null };
              }) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDragOver(false);
                if (disabled) return;
                const file = event.dataTransfer?.files?.[0];
                if (!file) {
                  setLocalError("No image detected in drop.");
                  return;
                }
                setLocalError(null);
                await readWebFile(file);
              },
              onPaste: async (event: {
                preventDefault: () => void;
                clipboardData?: {
                  items?: {
                    type: string;
                    getAsFile: () => File | null;
                  }[];
                };
              }) => {
                if (disabled) return;
                const items = event.clipboardData?.items ?? [];
                for (const item of items) {
                  if (!item.type.startsWith("image/")) continue;
                  const file = item.getAsFile();
                  if (!file) continue;
                  event.preventDefault();
                  setLocalError(null);
                  await readWebFile(file);
                  return;
                }
                setLocalError("Paste an image from your clipboard.");
              },
            } as Record<string, unknown>)
          : {})}
      >
        <Text style={styles.dropTitle}>
          {Platform.OS === "web" ? "Drop, paste or upload screenshot" : "Upload receipt screenshot"}
        </Text>
        <Text style={styles.dropSubtitle}>
          {Platform.OS === "web"
            ? "Drag in a screenshot, paste from clipboard, or choose an image."
            : "Choose a screenshot/photo of a receipt, invoice, or bill."}
        </Text>
        <Pressable
          onPress={() => void onPickImage()}
          disabled={disabled}
          style={[styles.pickButton, disabled && styles.pickButtonDisabled]}
        >
          <Text style={styles.pickButtonText}>
            {Platform.OS === "web" ? "Upload screenshot" : "Choose image"}
          </Text>
        </Pressable>
      </View>
      {localError ? <Text style={styles.localError}>{localError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    gap: spacing.xs,
  },
  dropZone: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.authBorderStrong,
    borderRadius: radii.md,
    backgroundColor: "#FAFBFE",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  dropZoneActive: {
    borderColor: colors.authBrand,
    backgroundColor: "#FFF2F5",
  },
  dropZoneDisabled: {
    opacity: 0.6,
  },
  dropTitle: {
    color: colors.webLandingText,
    fontSize: 13,
    fontWeight: "700",
  },
  dropSubtitle: {
    color: colors.webLandingSubtext,
    fontSize: 12,
    lineHeight: 18,
  },
  pickButton: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    backgroundColor: colors.authBrand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pickButtonDisabled: {
    backgroundColor: "#C8CEDB",
  },
  pickButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  localError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
});
