import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of service · Mycelium" };

const CONTACT = "shoaib.qadeer@learningplanetinstitute.org";

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="30 October 2026">
      <p>
        These terms cover your use of Mycelium, a free, non-commercial tool for the Learning Planet Institute (LPI) student
        community, run by Shoaib Qadeer. By signing in you agree to them. If you don&apos;t, please don&apos;t use the app.
      </p>

      <h2>Who can use it</h2>
      <p>
        Mycelium is open to people with a Learning Planet Institute Google account and to guests the admin invites. The admin
        may require approval for new members, and may pause or remove accounts that break these terms.
      </p>

      <h2>Your account</h2>
      <p>
        You sign in with Google and are responsible for what happens under your account. You can delete it at any time in
        Settings, which removes everything you added.
      </p>

      <h2>What you add</h2>
      <p>
        You keep ownership of what you put in your map. You give Mycelium permission to store and process it only to run the
        features described in the <Link href="/privacy">privacy policy</Link>, such as showing your map, the name-free club
        view, and introductions.
      </p>
      <p>Because the people in your map haven&apos;t signed up themselves, you agree to:</p>
      <ul>
        <li>add only accurate, ordinary information you&apos;d be comfortable telling them you wrote down;</li>
        <li>never add sensitive details (health, religion, politics, sexuality, immigration status, finances, criminal matters);</li>
        <li>never try to work out who someone on a name-free card is, outside of the introduction process;</li>
        <li>remove someone from your map if they ask you to.</li>
      </ul>

      <h2>Introductions</h2>
      <p>
        Introductions are favours between people, not a service. A member is free to decline any request, and nobody has to
        give a reason. Be respectful in your notes and in any contact that follows.
      </p>

      <h2>Not allowed</h2>
      <ul>
        <li>harassment, spam, or using the app to sell or recruit without consent;</li>
        <li>scraping, bulk-exporting other members&apos; data, or trying to get around access controls;</li>
        <li>uploading anything unlawful or that you don&apos;t have the right to share.</li>
      </ul>

      <h2>AI features</h2>
      <p>
        Some features use Google&apos;s Gemini to read your notes or match club searches. AI can be wrong: check what it
        suggests before saving it, and don&apos;t rely on it for important decisions.
      </p>

      <h2>No guarantees</h2>
      <p>
        Mycelium is a student project provided as it is, without warranties. It may change, pause or shut down, and features
        may be switched on or off. We will try to give notice before shutting down, so you can download your map. To the
        extent the law allows, we aren&apos;t liable for indirect losses from using it.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. If a change matters, we&apos;ll show a notice in the app first. Continuing to use Mycelium
        after that means you accept the new terms.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by French law.</p>

      <h2>Contact</h2>
      <p>{CONTACT}</p>
    </LegalPage>
  );
}
