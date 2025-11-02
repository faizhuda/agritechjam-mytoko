import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card className="rounded-2xl shadow-lg border">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Welcome to <strong>MyToko</strong>. By accessing or using our website and services, you agree to comply with
            and be bound by the following Terms of Service.
          </p>

          <h2 className="text-lg font-medium mt-6">1. Use of Service</h2>
          <p>
            You may use our services only for lawful purposes and in accordance with these Terms. You agree not to
            misuse or interfere with the proper functioning of the platform.
          </p>

          <h2 className="text-lg font-medium mt-6">2. Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities
            that occur under your account.
          </p>

          <h2 className="text-lg font-medium mt-6">3. Limitation of Liability</h2>
          <p>
            MyToko will not be liable for any indirect, incidental, or consequential damages arising from your use of
            the service.
          </p>

          <h2 className="text-lg font-medium mt-6">4. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service means you accept the updated
            Terms.
          </p>

          <p className="mt-8">Last updated: <strong>November 2025</strong></p>
        </CardContent>
      </Card>
    </div>
  )
}
