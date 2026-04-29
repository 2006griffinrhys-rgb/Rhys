import { createFileRoute } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { getMyProfile, getSignedInUser, updateProfile } from '#/lib/db'
import type { Profile } from '#/lib/types'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const user = await getSignedInUser()
      const data = await getMyProfile(user)
      setProfile(data)
    }

    void load()
  }, [])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) {
      return
    }

    setIsSaving(true)
    try {
      await updateProfile(profile.id, {
        display_name: profile.display_name,
        bio: profile.bio,
        city: profile.city,
        avatar_url: profile.avatar_url,
      })
      toast.success('Profile saved')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save profile right now.'
      toast.error('Save failed', { description: message })
    } finally {
      setIsSaving(false)
    }
  }

  if (!profile) {
    return (
      <div className="px-4 py-10">
        <section className="page-shell">Loading profile...</section>
      </div>
    )
  }

  return (
    <div className="px-4 py-10">
      <section className="page-shell max-w-3xl">
        <h1 className="mb-6 text-4xl text-foreground sm:text-5xl">Edit profile</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Your profile for this month&apos;s matching
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={save}>
              <div className="space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  value={profile.display_name}
                  onChange={(event) =>
                    setProfile((current) =>
                      current
                        ? { ...current, display_name: event.target.value }
                        : current,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={(event) =>
                    setProfile((current) =>
                      current ? { ...current, city: event.target.value } : current,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar-url">Avatar URL</Label>
                <Input
                  id="avatar-url"
                  value={profile.avatar_url ?? ''}
                  onChange={(event) =>
                    setProfile((current) =>
                      current
                        ? { ...current, avatar_url: event.target.value || null }
                        : current,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(event) =>
                    setProfile((current) =>
                      current ? { ...current, bio: event.target.value } : current,
                    )
                  }
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
