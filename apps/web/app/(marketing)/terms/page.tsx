import Link from "next/link";

const CONTACT_EMAIL = "mtandaolabs@gmail.com";

export default function Page() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.25rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.65 }}>
      <Link href="/">← Back home</Link>
      <h1>Terms &amp; Conditions</h1>
      <p style={{ color: "#5b6470" }}>
        These terms govern a school&apos;s use of MtandaoLabsEdu. By registering
        a school or using the platform, you agree to them on behalf of that
        school.
      </p>

      <h2>The service</h2>
      <p>
        MtandaoLabsEdu provides software for managing students, CBC academics,
        fees, and school communication. The platform is a tool for schools; it
        is not an official KICD or KNEC system.
      </p>

      <h2>Accounts</h2>
      <p>
        You are responsible for the accuracy of the information you provide, for
        keeping credentials secure, and for the activity of users you invite to
        your school&apos;s account. Each school&apos;s data is isolated from
        other schools.
      </p>

      <h2>Trials, plans, and payment</h2>
      <p>
        Unless stated otherwise, new schools start on a free trial. After the
        trial, continued access requires an active subscription at the current
        plan price. Prices and plan limits are shown on the pricing page and may
        change with notice.
      </p>

      <h2>Third-party integrations</h2>
      <p>
        Payment, email, and WhatsApp features depend on providers that each
        school configures (for example M-Pesa, an SMTP provider, or Evolution
        API). Availability and fees for those services are governed by the
        provider, not by MtandaoLabsEdu.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You agree not to misuse the platform, attempt to access other schools&apos;
        data, or use the service unlawfully. You are responsible for having a
        lawful basis to process the student and guardian data you enter.
      </p>

      <h2>Availability and liability</h2>
      <p>
        We work to keep the platform available and secure, but it is provided
        &ldquo;as is&rdquo; without warranties. To the extent permitted by law,
        MtandaoLabsEdu is not liable for indirect or consequential losses
        arising from use of the service.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms as the service evolves. Material changes will
        be communicated to school administrators.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <p style={{ color: "#5b6470", fontSize: "0.85rem", marginTop: "2rem" }}>
        This summary describes current practice and is not legal advice.
      </p>
    </div>
  );
}
