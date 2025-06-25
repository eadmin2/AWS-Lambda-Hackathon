import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, ClipboardList, Calculator, MapPin } from "lucide-react";
import { LazyMotion, domAnimation, m } from 'framer-motion';

const navItems = [
  { label: "Documents", icon: <FileText />, to: "/documents" },
  { label: "Detected Conditions", icon: <ClipboardList />, to: "/dashboard/conditions" },
  { label: "Combined Rating Calculator", icon: <Calculator />, to: "/calculator" },
  { label: "VA Forms", icon: <FileText />, to: "/dashboard/forms" },
  { label: "VA Facilities", icon: <MapPin />, to: "/facilities" },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  return (
    <LazyMotion features={domAnimation} strict>
      <m.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col min-h-screen"
      >
        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors font-medium text-base ${location.pathname === item.to ? "bg-primary-100 text-primary-800" : ""}`}
              aria-current={location.pathname === item.to ? "page" : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </m.aside>
    </LazyMotion>
  );
};

export default Sidebar; 