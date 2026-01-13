import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  Shield,
  Zap,
  LayoutDashboard,
  FileText,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Globe,
  BookOpen,
  Workflow,
  FolderKanban,
  UserCog,
  Eye,
  Lock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mainFeatures = [
  {
    icon: Building2,
    title: "Multi-Tenant Architecture",
    description:
      "Run multiple companies from a single platform. Each tenant has complete data isolation with secure, scoped access controls.",
  },
  {
    icon: Users,
    title: "Flexible User Management",
    description:
      "Support for internal employees, external contractors, and guest users. Define who sees what across your organization.",
  },
  {
    icon: Shield,
    title: "Role-Based Access Control",
    description:
      "Granular permissions from site admins to module-specific roles. Control access at the company, location, and module level.",
  },
  {
    icon: Layers,
    title: "Modular Design",
    description:
      "Enable only the modules you need. Projects, Tasks, Documents, LMS, and more - all seamlessly integrated.",
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    description:
      "Row-level security, encrypted data, and comprehensive audit logs. Your data is protected at every layer.",
  },
  {
    icon: Globe,
    title: "Public Forms",
    description:
      "Create and publish forms that can accept submissions without login. Perfect for surveys, applications, and feedback.",
  },
];

const modules = [
  {
    icon: FolderKanban,
    name: "Projects",
    description: "Plan, track, and deliver projects with visual boards and timelines.",
  },
  {
    icon: CheckCircle2,
    name: "Tasks",
    description: "Manage to-dos with assignments, due dates, and progress tracking.",
  },
  {
    icon: Calendar,
    name: "Calendar",
    description: "Schedule events, meetings, and deadlines across your organization.",
  },
  {
    icon: FileText,
    name: "Documents",
    description: "Store, organize, and collaborate on files with version control.",
  },
  {
    icon: MessageSquare,
    name: "Notes",
    description: "Capture ideas and meeting notes with rich text editing.",
  },
  {
    icon: Globe,
    name: "Forms",
    description: "Build custom forms and surveys with conditional logic.",
  },
  {
    icon: Workflow,
    name: "Workflows",
    description: "Automate processes with customizable approval workflows.",
  },
  {
    icon: BookOpen,
    name: "LMS",
    description: "Create courses and training programs for your team.",
  },
];

const roles = [
  {
    icon: UserCog,
    name: "Site Admin",
    description: "Manage all companies, enable modules, and publish global resources.",
  },
  {
    icon: Building2,
    name: "Company Admin",
    description: "Manage your company's users, locations, and module access.",
  },
  {
    icon: Eye,
    name: "Module Admin",
    description: "Administer specific modules within your company.",
  },
  {
    icon: Users,
    name: "User",
    description: "Access assigned modules and collaborate with your team.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative py-20 lg:py-32">
        <div className="absolute inset-0 gradient-subtle" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6"
            >
              Powerful Features for{" "}
              <span className="text-gradient">Modern Teams</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-muted-foreground mb-8"
            >
              Everything you need to run a multi-tenant organization, all in one
              beautiful platform.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Core Platform Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built from the ground up for enterprise-grade multi-tenancy.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full gradient-card border-border/50 hover:shadow-lg transition-all hover:-translate-y-1">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Integrated <span className="text-gradient">Modules</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enable only what you need. Each module is fully integrated with the platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module, index) => (
              <motion.div
                key={module.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <module.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{module.name}</h3>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Flexible <span className="text-gradient">Role System</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Define exactly who can access what across your organization.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {roles.map((role, index) => (
              <motion.div
                key={role.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6"
              >
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-md">
                  <role.icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{role.name}</h3>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Start your free trial today and see how BibleOS can transform your organization.
            </p>
            <Link to="/signup">
              <Button variant="hero" size="xl">
                Start Free Trial
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
