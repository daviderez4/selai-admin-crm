'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCRMStore } from '@/lib/stores/crmStore';
import type { Contact, ContactStatus } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowRight,
  Edit,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  User,
  MessageSquare,
  FileText,
  TrendingUp,
  AlertTriangle,
  Clock,
  Target,
  Users,
  Loader2,
} from 'lucide-react';

const statusLabels: Record<ContactStatus, string> = {
  active: 'פעיל',
  inactive: 'לא פעיל',
  prospect: 'פוטנציאלי',
  converted: 'הומר',
  archived: 'בארכיון',
};

const statusColors: Record<ContactStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  prospect: 'bg-blue-100 text-blue-800',
  converted: 'bg-purple-100 text-purple-800',
  archived: 'bg-gray-100 text-gray-500',
};

interface Customer360Props {
  contactId: string;
}

export function Customer360({ contactId }: Customer360Props) {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const { selectedContact, isLoadingContacts, error, fetchContact } = useCRMStore();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchContact(contactId);
  }, [contactId, fetchContact]);

  if (isLoadingContacts) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !selectedContact) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium">שגיאה בטעינת איש הקשר</h3>
        <p className="text-gray-500 mt-2">{error || 'איש הקשר לא נמצא'}</p>
        <Button onClick={() => router.back()} className="mt-4">
          חזרה
        </Button>
      </div>
    );
  }

  const contact = selectedContact;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowRight className="h-4 w-4 ml-2" />
            חזרה
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{contact.full_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={statusColors[contact.status]}>
                  {statusLabels[contact.status]}
                </Badge>
                {contact.tags?.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/projects/${projectId}/crm/contacts/${contactId}/edit`)
            }
          >
            <Edit className="h-4 w-4 ml-2" />
            עריכה
          </Button>
          <Button>
            <MessageSquare className="h-4 w-4 ml-2" />
            שלח הודעה
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {contact.policies?.length || 0}
                </div>
                <div className="text-sm text-gray-500">פוליסות</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {contact.deals?.length || 0}
                </div>
                <div className="text-sm text-gray-500">עסקאות</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {contact.tasks?.filter((t) => t.status !== 'completed').length ||
                    0}
                </div>
                <div className="text-sm text-gray-500">משימות פתוחות</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {contact.coverage_gaps?.filter((g) => g.status === 'open')
                    .length || 0}
                </div>
                <div className="text-sm text-gray-500">פערים</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">סקירה</TabsTrigger>
          <TabsTrigger value="policies">פוליסות</TabsTrigger>
          <TabsTrigger value="deals">עסקאות</TabsTrigger>
          <TabsTrigger value="tasks">משימות</TabsTrigger>
          <TabsTrigger value="messages">הודעות</TabsTrigger>
          <TabsTrigger value="gaps">פערים</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>פרטי התקשרות</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(contact.mobile || contact.phone) && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">טלפון</div>
                      <div>{contact.mobile || contact.phone}</div>
                    </div>
                  </div>
                )}

                {contact.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">אימייל</div>
                      <div>{contact.email}</div>
                    </div>
                  </div>
                )}

                {(contact.city || contact.address) && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">כתובת</div>
                      <div>
                        {contact.address}
                        {contact.address && contact.city && ', '}
                        {contact.city}
                      </div>
                    </div>
                  </div>
                )}

                {contact.birth_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">תאריך לידה</div>
                      <div>
                        {new Date(contact.birth_date).toLocaleDateString('he-IL')}
                      </div>
                    </div>
                  </div>
                )}

                {contact.occupation && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">תפקיד</div>
                      <div>{contact.occupation}</div>
                    </div>
                  </div>
                )}

                {contact.id_number && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">ת.ז.</div>
                      <div>{contact.id_number}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scores */}
            {contact.scores && (
              <Card>
                <CardHeader>
                  <CardTitle>ציונים</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScoreItem
                    label="מעורבות"
                    value={contact.scores.engagement_score}
                  />
                  <ScoreItem
                    label="שביעות רצון"
                    value={contact.scores.satisfaction_score}
                  />
                  <ScoreItem
                    label="סיכון נטישה"
                    value={contact.scores.churn_risk_score}
                    inverted
                  />
                  <ScoreItem
                    label="פוטנציאל צמיחה"
                    value={contact.scores.growth_potential_score}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Family Members */}
          {contact.family && contact.family.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  בני משפחה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {contact.family.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-gray-500">
                          {member.relationship}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle>הערות</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>פוליסות</CardTitle>
              <Button size="sm">
                <FileText className="h-4 w-4 ml-2" />
                פוליסה חדשה
              </Button>
            </CardHeader>
            <CardContent>
              {contact.policies && contact.policies.length > 0 ? (
                <div className="space-y-4">
                  {contact.policies.map((policy) => (
                    <div
                      key={policy.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{policy.policy_type}</div>
                        <div className="text-sm text-gray-500">
                          {policy.insurance_company_name}
                          {policy.policy_number && ` - ${policy.policy_number}`}
                        </div>
                      </div>
                      <div className="text-left">
                        {policy.premium_monthly && (
                          <div className="font-medium">
                            ₪{policy.premium_monthly.toLocaleString()}/חודש
                          </div>
                        )}
                        <Badge
                          className={
                            policy.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {policy.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto opacity-50 mb-2" />
                  אין פוליסות
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>עסקאות</CardTitle>
              <Button size="sm">
                <Target className="h-4 w-4 ml-2" />
                עסקה חדשה
              </Button>
            </CardHeader>
            <CardContent>
              {contact.deals && contact.deals.length > 0 ? (
                <div className="space-y-4">
                  {contact.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{deal.title}</div>
                        <div className="text-sm text-gray-500">
                          {deal.product_type}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-medium">
                          ₪{deal.amount.toLocaleString()}
                        </div>
                        <Badge
                          className={
                            deal.status === 'won'
                              ? 'bg-green-100 text-green-800'
                              : deal.status === 'lost'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {deal.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto opacity-50 mb-2" />
                  אין עסקאות
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>משימות</CardTitle>
              <Button size="sm">
                <Clock className="h-4 w-4 ml-2" />
                משימה חדשה
              </Button>
            </CardHeader>
            <CardContent>
              {contact.tasks && contact.tasks.length > 0 ? (
                <div className="space-y-4">
                  {contact.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{task.title}</div>
                        {task.due_date && (
                          <div className="text-sm text-gray-500">
                            תאריך יעד:{' '}
                            {new Date(task.due_date).toLocaleDateString('he-IL')}
                          </div>
                        )}
                      </div>
                      <Badge
                        className={
                          task.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : task.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto opacity-50 mb-2" />
                  אין משימות
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>הודעות</CardTitle>
              <Button size="sm">
                <MessageSquare className="h-4 w-4 ml-2" />
                הודעה חדשה
              </Button>
            </CardHeader>
            <CardContent>
              {contact.messages && contact.messages.length > 0 ? (
                <div className="space-y-4">
                  {contact.messages.slice(0, 10).map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 border rounded-lg ${
                        message.direction === 'outbound'
                          ? 'bg-primary/5 mr-8'
                          : 'bg-gray-50 ml-8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{message.channel}</Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(message.created_at).toLocaleString('he-IL')}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto opacity-50 mb-2" />
                  אין הודעות
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Gaps Tab */}
        <TabsContent value="gaps" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                פערי כיסוי
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contact.coverage_gaps && contact.coverage_gaps.length > 0 ? (
                <div className="space-y-4">
                  {contact.coverage_gaps.map((gap) => (
                    <div
                      key={gap.id}
                      className="p-4 border rounded-lg border-r-4 border-r-orange-500"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{gap.title}</div>
                        <Badge
                          className={
                            gap.priority === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : gap.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {gap.priority}
                        </Badge>
                      </div>
                      {gap.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {gap.description}
                        </p>
                      )}
                      {gap.recommended_product && (
                        <div className="text-sm">
                          <span className="font-medium">המלצה: </span>
                          {gap.recommended_product}
                          {gap.recommended_company && ` (${gap.recommended_company})`}
                        </div>
                      )}
                      {gap.estimated_premium && (
                        <div className="text-sm text-gray-500">
                          פרמיה משוערת: ₪{gap.estimated_premium.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto opacity-50 mb-2" />
                  לא זוהו פערי כיסוי
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreItem({
  label,
  value,
  inverted = false,
}: {
  label: string;
  value: number;
  inverted?: boolean;
}) {
  const getColor = () => {
    const effectiveValue = inverted ? 100 - value : value;
    if (effectiveValue >= 70) return 'bg-green-500';
    if (effectiveValue >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
