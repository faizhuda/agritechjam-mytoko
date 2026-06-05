export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none">
        <h1 className="text-3xl font-black mb-6 text-black uppercase tracking-tight border-b-4 border-black pb-2 bg-yellow-200 -mx-8 -mt-8 p-6">
          Privacy Policy
        </h1>
        <div className="space-y-4 text-sm leading-relaxed text-black font-bold">
          <p className="text-base">
            This Privacy Policy describes how <strong>MyToko</strong> collects, uses, and protects your personal
            information when you use our website and services.
          </p>

          <h2 className="text-xl font-black mt-8 text-black uppercase tracking-tight border-b-2 border-black pb-1">1. Information We Collect</h2>
          <p>
            We may collect personal information such as your name, email address, and activity data when you register,
            make purchases, or interact with our platform.
          </p>

          <h2 className="text-xl font-black mt-8 text-black uppercase tracking-tight border-b-2 border-black pb-1">2. How We Use Information</h2>
          <p>
            Your information is used to provide and improve our services, communicate with you, and ensure platform
            security.
          </p>

          <h2 className="text-xl font-black mt-8 text-black uppercase tracking-tight border-b-2 border-black pb-1">3. Data Protection</h2>
          <p>We take reasonable measures to protect your data against unauthorized access or disclosure.</p>

          <h2 className="text-xl font-black mt-8 text-black uppercase tracking-tight border-b-2 border-black pb-1">4. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. You are encouraged to review it regularly to stay informed
            about how we protect your data.
          </p>

          <p className="mt-8 pt-4 border-t-2 border-black text-stone-600">Last updated: <strong>November 2025</strong></p>
        </div>
      </div>
    </div>
  )
}
