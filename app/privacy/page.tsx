import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card className="rounded-2xl shadow-lg border">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            This Privacy Policy describes how <strong>MyToko</strong> collects, uses, and protects your personal
            information when you use our website and services.
          </p>

          <h2 className="text-lg font-medium mt-6">1. Information We Collect</h2>
          <p>
            We may collect personal information such as your name, email address, and activity data when you register,
            make purchases, or interact with our platform.
          </p>

          <h2 className="text-lg font-medium mt-6">2. How We Use Information</h2>
          <p>
            Your information is used to provide and improve our services, communicate with you, and ensure platform
            security.
          </p>

          <h2 className="text-lg font-medium mt-6">3. Data Protection</h2>
          <p>We take reasonable measures to protect your data against unauthorized access or disclosure.</p>

          <h2 className="text-lg font-medium mt-6">4. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. You are encouraged to review it regularly to stay informed
            about how we protect your data.
          </p>

          <p className="mt-8">Last updated: <strong>November 2025</strong></p>
        </CardContent>
      </Card>
    </div>
  )
}
