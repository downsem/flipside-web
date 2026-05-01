export const metadata = {
  title: "Privacy Policy | FlipSide",
  description: "Privacy Policy for FlipSide.",
};

const contactEmail = "ethanmdowns@gmail.com";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0b0714] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-10">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-purple-300">
          FlipSide
        </p>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          Privacy Policy
        </h1>

        <p className="mt-4 text-sm text-white/60">
          Last updated: May 1, 2026
        </p>

        <div className="mt-8 space-y-8 text-base leading-7 text-white/80">
          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">
              Overview
            </h2>
            <p>
              This Privacy Policy explains how FlipSide collects, uses, stores,
              and shares information when you use the FlipSide mobile app,
              website, and related services. FlipSide is a perspective-taking app
              that lets users create short posts, generate alternative
              perspectives, save Flips, and share lens results.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">
              Information We Collect
            </h2>
            <p>
              Depending on how you use FlipSide, we may collect the following
              types of information:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-white">Account information:</strong>{" "}
                email address, authentication identifier, display name, username,
                or other profile details you choose to provide.
              </li>
              <li>
                <strong className="text-white">User content:</strong> posts,
                Flips, prompts, lens responses, saved content, and other text or
                content you create in the app.
              </li>
              <li>
                <strong className="text-white">App activity and technical data:</strong>{" "}
                basic usage events, device type, app version, crash/debug
                information, and identifiers needed to operate the app and keep
                your account linked to your content.
              </li>
              <li>
                <strong className="text-white">Support information:</strong>{" "}
                information you provide if you contact us for help, feedback, or
                account support.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">
              AI-Generated Content
            </h2>
            <p>
              When you create a Flip, the text you submit may be sent to an AI
              service provider so the app can generate alternative perspectives.
              You should avoid submitting sensitive personal information,
              confidential information, or content you do not have permission to
              use.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">
              How We Use Information
            </h2>
            <p>We use information to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Create, save, display, and sync your Flips and account data.</li>
              <li>Generate alternative perspectives and improve app functionality.</li>
              <li>Maintain account access, security, reliability, and app performance.</li>
              <li>Respond to support requests and user feedback.</li>
              <li>Understand and improve the product experience.</li>
              <li>Comply with legal obligations and enforce our terms or policies.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">
              Third-Party Services
            </h2>
            <p>
              FlipSide uses third-party service providers to operate core app
              functionality. These may include authentication, cloud database,
              hosting, analytics, error logging, and AI-generation services.
              These providers process information only as needed to provide
              services to FlipSide, subject to their own terms and privacy
              practices.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">
              How We Share Information
            </h2>
            <p>
              We do not sell your personal information. We may share information
              with service providers that help us operate the app, when required
              by law, to protect the safety or integrity of the service, or as
              part of a business transfer such as a merger, acquisition, or asset
              sale.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">
              Data Retention and Deletion
            </h2>
            <p>
              We keep information for as long as needed to provide FlipSide,
              maintain records, comply with legal obligations, resolve disputes,
              and enforce agreements. You may request account or data deletion by
              contacting us at{" "}
              <a
                className="font-medium text-purple-300 underline decoration-purple-300/50 underline-offset-4"
                href={`mailto:${contactEmail}`}
              >
                {contactEmail}
              </a>
              . Some information may remain in backups, logs, or records where
              required for security, legal, or operational reasons.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">
              Children’s Privacy
            </h2>
            <p>
              FlipSide is not intended for children under 13. We do not
              knowingly collect personal information from children under 13. If
              you believe a child has provided personal information to FlipSide,
              please contact us so we can take appropriate action.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">
              Security
            </h2>
            <p>
              We use reasonable administrative, technical, and organizational
              safeguards designed to protect information. No internet-based
              service is completely secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">
              International Processing
            </h2>
            <p>
              Information may be processed and stored in the United States or
              other countries where FlipSide or its service providers operate.
              By using FlipSide, you understand that your information may be
              transferred to and processed outside your location.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">
              Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. If we make
              material changes, we will update the “Last updated” date above and
              provide notice where appropriate.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-white">
              Contact
            </h2>
            <p>
              For questions, requests, or concerns about this Privacy Policy,
              contact us at{" "}
              <a
                className="font-medium text-purple-300 underline decoration-purple-300/50 underline-offset-4"
                href={`mailto:${contactEmail}`}
              >
                {contactEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
