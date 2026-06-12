import {
    Activity,
    BarChart3,
    Bell,
    Briefcase,
    Camera,
    ClipboardList,
    Crown,
    LayoutGrid,
    MapPin,
    Megaphone,
    Search,
    Settings,
    ShieldCheck,
    UserCircle,
    Users,
} from "lucide-react";

export const roleDefinitions = {
  ceo: {
    name: "CEO",
    description: "Executive overview",
    icon: Crown,
  },
  quality: {
    name: "Quality Manager",
    description: "Quality and risk",
    icon: ShieldCheck,
  },
  business: {
    name: "Business Manager",
    description: "Operations and revenue",
    icon: Briefcase,
  },
  marketing: {
    name: "Marketing Manager",
    description: "Campaign performance",
    icon: Megaphone,
  },
};

export const navigationByRole = {
  ceo: [
    { label: "Executive Dashboard", href: "/dashboard/ceo", icon: LayoutGrid },
    { label: "AI Intelligence Center", href: "/analytics", icon: BarChart3 },
    { label: "Providers Map", href: "/providers-map", icon: MapPin },
    { label: "Face Check-in", href: "/face-checkin", icon: Camera },
    { label: "Activity", href: "/activity", icon: Activity },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Admin Panel", href: "/admin", icon: Users },
    { label: "Profile", href: "/profile", icon: UserCircle },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  quality: [
    { label: "Quality Dashboard", href: "/dashboard/quality", icon: ClipboardList },
    { label: "AI Intelligence Center", href: "/analytics", icon: BarChart3 },
    { label: "Providers Map", href: "/providers-map", icon: MapPin },
    { label: "Face Check-in", href: "/face-checkin", icon: Camera },
    { label: "Activity", href: "/activity", icon: Activity },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Profile", href: "/profile", icon: UserCircle },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  business: [
    { label: "Business Dashboard", href: "/dashboard/business", icon: Briefcase },
    { label: "AI Intelligence Center", href: "/analytics", icon: BarChart3 },
    { label: "Providers Map", href: "/providers-map", icon: MapPin },
    { label: "Face Check-in", href: "/face-checkin", icon: Camera },
    { label: "Search", href: "/search", icon: Search },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Profile", href: "/profile", icon: UserCircle },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  marketing: [
    { label: "Marketing Dashboard", href: "/dashboard/marketing", icon: Megaphone },
    { label: "AI Intelligence Center", href: "/analytics", icon: BarChart3 },
    { label: "Providers Map", href: "/providers-map", icon: MapPin },
    { label: "Face Check-in", href: "/face-checkin", icon: Camera },
    { label: "Search", href: "/search", icon: Search },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Profile", href: "/profile", icon: UserCircle },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
};
