export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none">
        <h1 className="text-3xl font-black mb-6 text-black uppercase tracking-tight border-b-4 border-black pb-2 bg-cyan-200 -mx-8 -mt-8 p-6">
          Terms of Service
        </h1>
        <div className="space-y-4 text-sm leading-relaxed text-black font-bold">
          <p className="text-base">
            Welcome to <strong>MyToko</strong>. By accessing or using our website and services, you agree to comply with
            and be bound by the following Terms of Service.
          </p>

          <h2 className="text-xl font-black mt-8 text-black uppercase tracking-tight border-b-2 border-black pb-1">1. Use of Service</h2>
          <p>
            You may use our services only for lawful purposes and in accordance with these Terms. You agree not to
            misuse or interfere with the proper functioning of the platform.
          </p>

          <h2 className="text-xl font-black mt-8 text-black uppercase tracking-tight border-b-2 border-black pb-1">2. Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities
            that occur under your account.
          </p>

          <h2 className="text-xl font-black mt-8 text-black uppercase tracking-tight border-b-2 border-black pb-1">3. Limitation of Liability</h2>
          <p>
            MyToko will not be liable for any indirect, incidental, or consequential damages arising from your use of
            the service.
          </p>

          <h2 className="text-xl font-black mt-8 text-black uppercase tracking-tight border-b-2 border-black pb-1">4. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service means you accept the updated
            Terms.
          </p>

          <p className="mt-8 pt-4 border-t-2 border-black text-stone-600">Last updated: <strong>November 2025</strong></p>
        </div>
      </div>
    </div>
  )
}
