import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();

  // Replace this with your actual HTML from Termly
  const termsOfServiceHTML = `
    <!-- Paste your Termly terms of service HTML here -->
    <h1>Terms of Service</h1>
    <p>This is where your Termly terms of service HTML content will go.</p>
    <p>Simply replace this placeholder content with the HTML code provided by Termly.</p>
  `;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            Terms of Service
          </h1>
        </div>

        {/* Terms of Service Content */}
        <Card className="bg-card border-border">
          <CardContent className="p-8">
            <div
              className="prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: termsOfServiceHTML }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
