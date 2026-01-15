/**
 * @feature GUEST-MANAGE-001
 * @module Guest Access
 * @description UI for managing project guests - invite, view, revoke
 * @related GUEST-API-001, GUEST-VIEW-001
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus,
  Copy,
  Trash2,
  Mail,
  Clock,
  Eye,
  Loader2,
  Check,
  AlertCircle,
  Users,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ProjectGuest } from '@/types'

interface GuestManagementProps {
  projectId: string
  projectName: string
}

export function GuestManagement({ projectId, projectName }: GuestManagementProps) {
  const [guests, setGuests] = useState<ProjectGuest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Invite form state
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('30')

  // Load guests
  const loadGuests = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/guests`)
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to load guests')
        return
      }

      setGuests(data.guests || [])
    } catch {
      toast.error('Failed to load guests')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadGuests()
  }, [loadGuests])

  // Success dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [lastInviteResult, setLastInviteResult] = useState<{
    accessUrl: string
    emailSent: boolean
    email: string
  } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // Invite guest
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsInviting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name || undefined,
          expiresInDays: parseInt(expiresInDays),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to invite guest')
        return
      }

      // Show success dialog with link
      setLastInviteResult({
        accessUrl: data.accessUrl,
        emailSent: data.emailSent,
        email: email,
      })
      setLinkCopied(false)
      setInviteDialogOpen(false)
      setSuccessDialogOpen(true)

      setEmail('')
      setName('')
      setExpiresInDays('30')
      loadGuests()
    } catch {
      toast.error('Failed to invite guest')
    } finally {
      setIsInviting(false)
    }
  }

  // Copy invite link from success dialog
  const copyInviteLink = async () => {
    if (lastInviteResult?.accessUrl) {
      await navigator.clipboard.writeText(lastInviteResult.accessUrl)
      setLinkCopied(true)
      toast.success('הקישור הועתק!')
    }
  }

  // Revoke access
  const handleRevoke = async (guestId: string, guestEmail: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${guestEmail}?`)) {
      return
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/guests?guestId=${guestId}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to revoke access')
        return
      }

      toast.success('Guest access revoked')
      loadGuests()
    } catch {
      toast.error('Failed to revoke access')
    }
  }

  // Copy access link
  const copyAccessLink = async (token: string) => {
    const url = `${window.location.origin}/guest/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopiedToken(null), 2000)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Check if expired
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Guest Access
            </CardTitle>
            <CardDescription>
              Invite external users to view this project without registration
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadGuests}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Guest
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Guest</DialogTitle>
                  <DialogDescription>
                    Send an invitation to view &quot;{projectName}&quot;. The guest will receive
                    an email with an access link.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="guest@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Name (optional)</Label>
                    <Input
                      id="name"
                      placeholder="Guest name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expires">Access Duration</Label>
                    <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isInviting}>
                      {isInviting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      {/* Success Dialog with Link */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              ההזמנה נוצרה בהצלחה
            </DialogTitle>
            <DialogDescription>
              {lastInviteResult?.emailSent ? (
                <>נשלחה הזמנה במייל אל {lastInviteResult?.email}</>
              ) : (
                <>
                  <span className="flex items-center gap-1 text-amber-600 mt-2">
                    <AlertCircle className="h-4 w-4" />
                    המייל לא נשלח (שירות המייל לא מוגדר)
                  </span>
                  <span className="block mt-1">
                    שלח את הקישור הבא ידנית אל {lastInviteResult?.email}:
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={lastInviteResult?.accessUrl || ''}
                className="flex-1 text-sm bg-slate-50"
                dir="ltr"
              />
              <Button
                type="button"
                size="sm"
                onClick={copyInviteLink}
                className={linkCopied ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {linkCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    הועתק!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    העתק
                  </>
                )}
              </Button>
            </div>

            {!lastInviteResult?.emailSent && (
              <div className="text-xs text-muted-foreground bg-amber-50 p-3 rounded-lg border border-amber-200">
                <strong>טיפ:</strong> תוכל להעתיק את הקישור ולשלוח אותו ידנית ב-WhatsApp, SMS או כל אמצעי אחר.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setSuccessDialogOpen(false)}
            >
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No guests invited yet</p>
            <p className="text-sm text-muted-foreground">
              Click &quot;Invite Guest&quot; to share this project
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Access</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{guest.name || guest.email}</p>
                      {guest.name && (
                        <p className="text-sm text-muted-foreground">{guest.email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {!guest.is_active ? (
                      <Badge variant="destructive">Revoked</Badge>
                    ) : isExpired(guest.expires_at) ? (
                      <Badge variant="secondary">Expired</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-600">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {guest.last_accessed_at ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Eye className="h-3 w-3" />
                        {formatDate(guest.last_accessed_at)}
                        <span className="text-muted-foreground">
                          ({guest.access_count}x)
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" />
                      {formatDate(guest.expires_at)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {guest.is_active && !isExpired(guest.expires_at) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyAccessLink(guest.access_token)}
                        >
                          {copiedToken === guest.access_token ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {guest.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(guest.id, guest.email)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
