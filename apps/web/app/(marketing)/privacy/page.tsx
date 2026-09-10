import Link from "next/link";

const CONTACT_EMAIL = "mtandaolabs@gmail.com";

export default function Page() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.25rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.65 }}>
      <Link href="/">← Back home</Link>
      <h1>Privacy Policy</h1>
      <p style={{ color: "#5b6470" }}>
        This policy explains what data MtandaoLabsEdu processes when a school
        uses the platform, and the choices available to schools, parents, and
        staff.
      </p>

      <h2>Who we are</h2>
      <p>
        MtandaoLabsEdu is a multi-tenant school management platform. Each school
        is the controller of its own data; MtandaoLabsEdu processes that data on
        the school&apos;s instructions.
      </p>

      <h2>Data we process</h2>
      <ul>
        <li>
          <strong>School and staff accounts:</strong> names, email addresses,
          phone numbers, roles, and authentication credentials.
        </li>
        <li>
          <strong>Student records:</strong> names, admission details, academic
          records, attendance, and assessment results.
        </li>
        <li>
          <strong>Guardian and contact information:</strong> as supplied by the
          school for communication and fee collection.
        </li>
        <li>
          <strong>Financial records:</strong> fee structures, invoices, and
          payment records. Card data is never stored; mobile money is processed
          through the school&apos;s configured provider (for example M-Pesa).
        </li>
        <li>
          <strong>Communications:</strong> email and WhatsApp message content
          and delivery status where a school enables those integrations.
        </li>
      </ul>

      <h2>How we use data</h2>
      <p>
        Data is used to operate the platform for the school: managing students
        and academics, issuing and reconciling fee invoices, sending
        communications the school initiates, and producing reports. We do not
        sell personal data or use it for advertising.
      </p>

      <h2>Sharing</h2>
      <p>
        Data is shared only with processors needed to run the service on the
        school&apos;s behalf — for example hosting and database providers, email
        delivery, WhatsApp messaging, and mobile money payment providers. Each
        school configures its own payment, email, and messaging integrations.
      </p>

      <h2>Retention and security</h2>
      <p>
        Data is retained for as long as the school&apos;s account is active.
        Sensitive integration credentials are encrypted at rest. Access within
        the platform is role-based, and administrative actions are recorded in
        audit logs.
      </p>

      <h2>Your rights</h2>
      <p>
        Requests to access, correct, or delete personal data should be made to
        the relevant school, which controls that data. We support schools in
        fulfilling those requests. Where applicable, this processing is carried
        out in line with the Kenya Data Protection Act.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <p style={{ color: "#5b6470", fontSize: "0.85rem", marginTop: "2rem" }}>
        This summary describes current practice and is not legal advice.
      </p>
    </div>
  );
}
