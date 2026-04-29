import { createFileRoute } from '@tanstack/react-router'
import { Bell, Camera, CreditCard, MessageSquare, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'
import {
  daysLeftInMonth,
  getActiveCategory,
  getCurrentCycle,
  getPayingCategory,
  monthName,
} from '#/lib/cycle'
import { MONTHLY_PRICE_GBP } from '#/lib/constants'
import {
  createFriendshipRequest,
  getCompletedProfiles,
  getCycleMatchesForUser,
  getIncomingRequests,
  getMyProfile,
  getProfilesByIds,
  getSignedInUser,
  hasRevealForPair,
  markPaidForCurrentCycle,
  setRequestStatus,
  upsertCycleMatch,
} from '#/lib/db'
import {
  buildMatchIdForCycle,
  canInstigateThisMonth,
  getPayingUserIdForPair,
  rankProfilesForMonth,
} from '#/lib/matching'
import { supabase } from '#/lib/supabase'
import type { FriendshipRequest, Profile, RankedMatch } from '#/lib/types'

export const Route = createFileRoute('/matches')({
  component: MatchesPage,
})

interface IncomingRequestView {
  request: FriendshipRequest
  sender: Profile | null
}

function MatchesPage() {
  const cycle = getCurrentCycle()

  const [loading, setLoading] = useState(true)
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [rankedMatches, setRankedMatches] = useState<RankedMatch[]>([])
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequestView[]>([])
  const [outgoingTarget, setOutgoingTarget] = useState<RankedMatch | null>(null)
  const [outgoingMessage, setOutgoingMessage] = useState('')
  const [revealMyPhoto, setRevealMyPhoto] = useState(false)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [requestToAccept, setRequestToAccept] = useState<IncomingRequestView | null>(null)
  const [paymentGateOpen, setPaymentGateOpen] = useState(false)
  const [processingAccept, setProcessingAccept] = useState(false)

  const activeCategory = getActiveCategory(cycle.month)
  const payingCategory = getPayingCategory(cycle.month)

  const canInstigate = myProfile
    ? canInstigateThisMonth(myProfile.category)
    : false

  const bannerText =
    cycle.month % 2 === 1
      ? 'Odd month: Side A instigates, Side B pays £9.99.'
      : 'Even month: Side B instigates, Side A pays £9.99.'

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const user = await getSignedInUser()
      const me = await getMyProfile(user)
      const others = await getCompletedProfiles(me.id)
      const topMatches = rankProfilesForMonth(me, others, 8)

      const cycleMatches = await getCycleMatchesForUser(me.id)
      const existingMatchKeys = new Set(
        cycleMatches.map((match) => {
          const [left, right] = [match.user_a, match.user_b].sort()
          return `${left}:${right}`
        }),
      )

      await Promise.all(
        topMatches.map(async (match) => {
          const [left, right] = [me.id, match.otherProfile.id].sort()
          const key = `${left}:${right}`
          if (!existingMatchKeys.has(key)) {
            await upsertCycleMatch({
              id: buildMatchIdForCycle(left, right, cycle.year, cycle.month),
              user_a: left,
              user_b: right,
              compatibility_score: match.compatibilityScore,
              cycle_year: cycle.year,
              cycle_month: cycle.month,
            })
          }

          if (!canInstigateThisMonth(me.category)) {
            const canSee = await hasRevealForPair(match.otherProfile.id, me.id)
            match.canSeeTheirPhoto = canSee
          }
        }),
      )

      const incoming = await getIncomingRequests(me.id)
      const senderProfiles = await getProfilesByIds(incoming.map((request) => request.sender_id))
      const senderMap = new Map(senderProfiles.map((profile) => [profile.id, profile]))
      const incomingView = incoming.map((request) => ({
        request,
        sender: senderMap.get(request.sender_id) ?? null,
      }))

      setMyProfile(me)
      setRankedMatches(topMatches)
      setIncomingRequests(incomingView)
    } finally {
      setLoading(false)
    }
  }, [cycle.month, cycle.year])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const incomingCount = incomingRequests.length
  const cycleMonthName = monthName(cycle.month)
  const daysLeft = daysLeftInMonth()

  const openReachOutDialog = (match: RankedMatch) => {
    setOutgoingTarget(match)
    setOutgoingMessage(
      `Hey ${match.otherProfile.display_name}, we matched on Tandem this month. Fancy a catch-up?`,
    )
    setRevealMyPhoto(false)
  }

  const sendRequest = async () => {
    if (!myProfile || !outgoingTarget || !outgoingMessage.trim()) {
      return
    }
    setSendingRequest(true)
    try {
      const target = outgoingTarget.otherProfile
      const [left, right] = [myProfile.id, target.id].sort()
      const matchId = buildMatchIdForCycle(left, right, cycle.year, cycle.month)

      await upsertCycleMatch({
        id: matchId,
        user_a: left,
        user_b: right,
        compatibility_score: outgoingTarget.compatibilityScore,
        cycle_year: cycle.year,
        cycle_month: cycle.month,
      })

      await createFriendshipRequest({
        matchId,
        senderId: myProfile.id,
        recipientId: target.id,
        message: outgoingMessage.trim(),
        revealPhoto: revealMyPhoto,
      })

      toast.success('Request sent', {
        description: `Your message was sent to ${target.display_name}.`,
      })
      setOutgoingTarget(null)
      await refresh()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to send request right now.'
      toast.error('Send failed', { description: message })
    } finally {
      setSendingRequest(false)
    }
  }

  const acceptIncomingRequest = async (request: IncomingRequestView) => {
    setProcessingAccept(true)
    try {
      await setRequestStatus(request.request.id, 'accepted')
      toast.success('Request accepted')
      setRequestToAccept(null)
      setPaymentGateOpen(false)
      await refresh()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not accept the request.'
      toast.error('Accept failed', { description: message })
    } finally {
      setProcessingAccept(false)
    }
  }

  const triggerAccept = (request: IncomingRequestView) => {
    if (!myProfile || !request.sender) {
      return
    }
    const payingUserId = getPayingUserIdForPair(myProfile, request.sender, cycle.month)
    const mustPay = payingUserId === myProfile.id && !myProfile.has_paid_current_cycle
    if (mustPay) {
      setRequestToAccept(request)
      setPaymentGateOpen(true)
      return
    }
    void acceptIncomingRequest(request)
  }

  const payThenAccept = async () => {
    if (!myProfile || !requestToAccept) {
      return
    }
    setProcessingAccept(true)
    try {
      await markPaidForCurrentCycle(myProfile.id)
      setMyProfile({ ...myProfile, has_paid_current_cycle: true })
      toast.success(`Unlocked ${cycleMonthName} for £${MONTHLY_PRICE_GBP.toFixed(2)}`)
      setPaymentGateOpen(false)
      await acceptIncomingRequest(requestToAccept)
    } finally {
      setProcessingAccept(false)
    }
  }

  const myProfileId = myProfile?.id

  useEffect(() => {
    if (!supabase || !myProfileId) {
      return
    }

    const channel = supabase
      .channel(`incoming-requests:${myProfileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendship_requests',
          filter: `recipient_id=eq.${myProfileId}`,
        },
        () => {
          toast.message('New incoming request')
          void refresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [myProfileId, refresh])

  if (loading || !myProfile) {
    return (
      <div className="px-4 py-10">
        <section className="page-shell">Loading matches...</section>
      </div>
    )
  }

  return (
    <div className="px-4 py-10">
      <section className="page-shell space-y-6">
        <div className="space-y-2">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Monthly cycle
          </p>
          <h1 className="text-4xl text-foreground sm:text-5xl">
            {cycleMonthName} {cycle.year} matches
          </h1>
        </div>

        <Card className="border-[var(--cat-a)] bg-secondary/35">
          <CardContent className="space-y-3 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">Instigating side: {activeCategory}</Badge>
              <Badge variant="outline">Paying side: {payingCategory}</Badge>
              <Badge variant="outline">{daysLeft} days left</Badge>
            </div>
            <p className="m-0 text-sm text-muted-foreground">{bannerText}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bell className="h-4 w-4 text-[var(--cat-a)]" />
              Incoming requests ({incomingCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {incomingRequests.length === 0 ? (
              <p className="m-0 text-sm text-muted-foreground">
                No pending incoming requests this cycle.
              </p>
            ) : (
              incomingRequests.map(({ request, sender }) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={sender?.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {(sender?.display_name ?? 'U').slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="m-0 text-sm font-semibold text-foreground">
                          {sender?.display_name ?? 'Unknown user'}
                        </p>
                        <p className="m-0 text-xs text-muted-foreground">
                          {sender?.city ?? 'Unknown city'} • {sender?.mbti_type ?? 'MBTI TBD'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => triggerAccept({ request, sender })}
                        disabled={processingAccept}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await setRequestStatus(request.id, 'declined')
                            toast.message('Request declined')
                            await refresh()
                          } catch (error) {
                            const message =
                              error instanceof Error
                                ? error.message
                                : 'Unable to decline this request.'
                            toast.error('Decline failed', { description: message })
                          }
                        }}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{request.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Your top 8 MBTI matches</CardTitle>
            <p className="m-0 text-sm text-muted-foreground">
              You are in side {myProfile.category}.{' '}
              {canInstigate
                ? 'You can instigate this month.'
                : 'You cannot instigate this month. Wait for incoming requests.'}
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {rankedMatches.map((match) => {
              const profile = match.otherProfile
              const showAvatar =
                canInstigate ? false : match.canSeeTheirPhoto && Boolean(profile.avatar_url)
              return (
                <article
                  key={profile.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {showAvatar ? (
                          <AvatarImage src={profile.avatar_url ?? undefined} />
                        ) : null}
                        <AvatarFallback>
                          {profile.display_name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="m-0 font-semibold text-foreground">{profile.display_name}</p>
                        <p className="m-0 text-xs text-muted-foreground">
                          {profile.city} • Side {profile.category}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{match.compatibilityScore}% fit</Badge>
                  </div>

                  <p className="m-0 text-sm text-muted-foreground">{profile.bio}</p>

                  <div className="flex items-center justify-between">
                    <p className="m-0 text-xs text-muted-foreground">{profile.mbti_type}</p>
                    <Button
                      size="sm"
                      disabled={!canInstigate}
                      onClick={() => openReachOutDialog(match)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Reach out
                    </Button>
                  </div>

                  {!showAvatar && !canInstigate ? (
                    <p className="m-0 text-xs text-muted-foreground">
                      Photo hidden unless this person revealed it to you this month.
                    </p>
                  ) : null}

                  {canInstigate ? (
                    <p className="m-0 text-xs text-muted-foreground">
                      Recipient photos stay hidden to instigators this cycle.
                    </p>
                  ) : null}
                </article>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <Dialog open={Boolean(outgoingTarget)} onOpenChange={(open) => !open && setOutgoingTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reach out</DialogTitle>
            <DialogDescription>
              Send a monthly intro request to {outgoingTarget?.otherProfile.display_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-message">Message</Label>
              <Textarea
                id="request-message"
                rows={5}
                value={outgoingMessage}
                onChange={(event) => setOutgoingMessage(event.target.value)}
              />
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="inline-flex items-center gap-2 text-sm">
                <Camera className="h-4 w-4 text-[var(--cat-a)]" />
                
                Reveal my photo to this recipient
              </span>
              <Switch checked={revealMyPhoto} onCheckedChange={setRevealMyPhoto} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutgoingTarget(null)}>
              Cancel
            </Button>
            <Button onClick={sendRequest} disabled={sendingRequest || !outgoingMessage.trim()}>
              {sendingRequest ? 'Sending...' : 'Send request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={paymentGateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Unlock {cycleMonthName} for £{MONTHLY_PRICE_GBP.toFixed(2)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are the paying user for this pair this month. Pay before accepting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
            <ShieldCheck className="mr-2 inline h-4 w-4 text-[var(--cat-a)]" />
            Monthly price is fixed at £{MONTHLY_PRICE_GBP.toFixed(2)}.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaymentGateOpen(false)}>
              Not now
            </AlertDialogCancel>
            <AlertDialogAction onClick={payThenAccept} disabled={processingAccept}>
              <CreditCard className="h-4 w-4" />
              {processingAccept ? 'Processing...' : 'Pay and accept'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
