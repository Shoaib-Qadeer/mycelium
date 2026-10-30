import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy · Mycelium" };

const CONTACT = "shoaib.qadeer@learningplanetinstitute.org";

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="30 October 2026">
      <p>
        Mycelium is a small, non-commercial tool for the Learning Planet Institute (LPI) student community. It helps members
        map the people they know, see the shape of their network, and ask each other for warm introductions. It is run by
        Shoaib Qadeer, a student at LPI, who is responsible for the data described here. This page explains what we keep,
        why, who can see it, and how to remove it.
      </p>

      <h2>What we collect</h2>
      <h3>About you, from Google sign-in</h3>
      <p>
        Your name, email address and profile picture. We use them to recognise you, to check that you are allowed in (an LPI
        address or an invitation), and to show your name to other members. We never see your Google password, and we don&apos;t
        ask for access to your contacts, calendar, Drive or email.
      </p>
      <h3>What you add to your map</h3>
      <p>
        The people you choose to add and the details you choose to give: name, circle, field, role, organization, city,
        country, interests, how close you are, when you were last in touch, an optional email and private notes. Also which of
        them know each other.
      </p>
      <h3>Introductions</h3>
      <p>Requests you send or receive: who asked, who was asked, your note, and the reply.</p>
      <h3>Usage records</h3>
      <p>
        When you last used the app, and a log of AI requests (time, which feature, size, success or failure) so the admin
        can keep within the AI budget. The log does not store the text you sent.
      </p>

      <h2>About the people in your map</h2>
      <p>
        The people you add have not signed up to Mycelium themselves. Please only add what you&apos;d be comfortable telling
        them you wrote down, and never add sensitive details such as health, religion, politics, sexuality or immigration
        status. Mycelium protects them in these ways:
      </p>
      <ul>
        <li>Their names, notes and emails are only ever visible to you.</li>
        <li>
          Other members see a name-free card instead, such as &ldquo;Researcher at UNESCO, Geneva&rdquo;. The admin can also
          hide organizations from these cards.
        </li>
        <li>You can keep any person out of the shared club view entirely.</li>
        <li>An introduction only happens if the member who knows them decides to make it.</li>
      </ul>
      <p>
        If you believe you appear in someone&apos;s map and want to be removed, write to {CONTACT} and we will make sure it
        happens.
      </p>

      <h2>Who can see what</h2>
      <ul>
        <li>
          <strong>You</strong> see everything in your own map.
        </li>
        <li>
          <strong>Other approved members</strong> see your name and photo, how many people you&apos;ve mapped, and the
          name-free cards described above.
        </li>
        <li>
          <strong>The admin</strong> sees the member list (names, emails, status, activity counts) and the AI usage log, to run
          access and keep costs under control. The admin panel does not show the contents of anyone&apos;s map.
        </li>
      </ul>
      <p>We don&apos;t sell data, show ads, or share data with anyone except the service providers below.</p>

      <h2>Service providers</h2>
      <ul>
        <li>
          <strong>Vercel</strong> hosts the website.
        </li>
        <li>
          <strong>MongoDB Atlas</strong> stores the database.
        </li>
        <li>
          <strong>Google</strong> provides sign-in. When you use &ldquo;Describe people&rdquo; or the club search, the text
          involved is sent to Google&apos;s Gemini API to be processed.
        </li>
      </ul>
      <p>These providers may process data outside the European Union under their own safeguards.</p>

      <h2>Why we&apos;re allowed to use it</h2>
      <p>
        We rely on your consent when you sign up and add information. We also have a legitimate interest in running a safe,
        invite-only tool for the community. You can withdraw at any time by deleting your account.
      </p>

      <h2>How long we keep it, and how to delete it</h2>
      <p>
        We keep your data while your account exists. <strong>Settings → Delete my account</strong> permanently removes:
      </p>
      <ul>
        <li>your account;</li>
        <li>your whole map;</li>
        <li>introductions you sent or received;</li>
        <li>your AI log entries.</li>
      </ul>
      <p>
        You can also download your map as a CSV at any time from Settings. Backups held by our database provider expire on
        their own schedule.
      </p>

      <h2>Your rights</h2>
      <p>Under the GDPR you can:</p>
      <ul>
        <li>ask for a copy of your data;</li>
        <li>correct it;</li>
        <li>delete it;</li>
        <li>restrict or object to how it is used;</li>
        <li>take it with you.</li>
      </ul>
      <p>
        Write to {CONTACT} and we will answer within a month. You can also complain to the CNIL (cnil.fr), the French data
        protection authority.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes in a way that matters, we&apos;ll show a notice in the app before the change applies.</p>

      <h2>Contact</h2>
      <p>{CONTACT}</p>
    </LegalPage>
  );
}
