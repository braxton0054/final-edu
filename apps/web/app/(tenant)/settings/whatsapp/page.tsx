import { redirect } from "next/navigation";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { getStatus } from "@/lib/whatsapp/service";
import WhatsAppPanel from "./WhatsAppPanel";

export const dynamic = "force-dynamic";

// Settings → WhatsApp. Server-guarded: only a signed-in school user ever
// renders this page. All Evolution interaction happens server-side.
export default async function WhatsAppSettingsPage() {
  const actor = await requireSchoolActor();
  if (!actor.ok) {
    redirect("/login?next=/settings/whatsapp");
  }

  const initial = await getStatus(actor.schoolId);

  return (
    <div>
      <h1>Settings → WhatsApp</h1>
      <p style={{ color: "#5b6470" }}>
        Connect the school&apos;s WhatsApp number to send fee reminders,
        payment confirmations, results, and announcements to parents.
      </p>
      <WhatsAppPanel initial={initial} />
    </div>
  );
}
