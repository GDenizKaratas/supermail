"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EmailAddress {
  id: string;
  accountId: string;
  name?: string | null;
  address: string;
  raw?: string | null;
}

interface Email {
  id: string;
  subject?: string | null;
  from: EmailAddress; // relation artık object
  bodySnippet?: string | null;
  hasAttachments: boolean;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  // opsiyonel bayraklar (istersen db’den derive edebilirsin)
  isRead?: boolean;
  isStarred?: boolean;
}

interface SyncResult {
  success: boolean;
  syncedCount: number;
  newEmails: number;
  totalMessages: number;
}

export default function DashboardPage() {
  const { userId } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const connectGmail = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/gmail/auth");
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Gmail connection error:", error);
      alert("Gmail bağlantısı başlatılamadı");
    } finally {
      setIsConnecting(false);
    }
  };

  const syncEmails = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setSyncResult(data);
        await loadEmails();
      } else {
        alert("Sync başarısız: " + data.error);
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Sync sırasında hata oluştu");
    } finally {
      setIsSyncing(false);
    }
  };

  const loadEmails = async () => {
    try {
      const response = await fetch("/api/emails");
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error("Load emails error:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      void loadEmails();
    }
  }, [userId]);

  if (!userId) {
    return <div>Giriş yapmanız gerekiyor.</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">Email Dashboard</h1>

        <div className="mb-6 flex gap-4">
          <Button
            onClick={connectGmail}
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? "Bağlanıyor..." : "Gmail Bağla"}
          </Button>

          <Button onClick={syncEmails} disabled={isSyncing} variant="outline">
            {isSyncing ? "Sync Ediliyor..." : "Email Sync Et"}
          </Button>
        </div>

        {syncResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Sync Sonucu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Toplam İşlenen</p>
                  <p className="text-2xl font-bold">{syncResult.syncedCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Yeni Email</p>
                  <p className="text-2xl font-bold text-green-600">
                    {syncResult.newEmails}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Toplam Mesaj</p>
                  <p className="text-2xl font-bold">
                    {syncResult.totalMessages}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Emailler ({emails.length})</h2>

        {emails.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              Henüz email yok. Gmail hesabınızı bağlayıp sync edin.
            </CardContent>
          </Card>
        ) : (
          emails.map((email) => (
            <Card
              key={email.id}
              className={!email.isRead ? "border-blue-200 bg-blue-50" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {email.subject || "(Konu Yok)"}
                      </h3>
                      {!email.isRead && (
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800"
                        >
                          Yeni
                        </Badge>
                      )}
                      {email.isStarred && (
                        <Badge variant="outline" className="text-yellow-600">
                          ⭐
                        </Badge>
                      )}
                    </div>
                    <p className="mb-1 text-sm text-gray-600">
                      <strong>Kimden:</strong>{" "}
                      {email.from?.name
                        ? `${email.from.name} <${email.from.address}>`
                        : email.from?.address}
                    </p>
                    <p className="mb-2 text-gray-700">{email.bodySnippet}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(email.receivedAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
