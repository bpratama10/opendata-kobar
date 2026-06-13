import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User, Menu, X, Shield, LogOut, Info, List } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import lambangHeader from "@/assets/lambang_opt.png";
import "./Header.css";

export const Header: React.FC = () => {
  const { user, profile, canAccessAdmin, orgRoles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLearnDropdown, setShowLearnDropdown] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const learnRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (learnRef.current && !learnRef.current.contains(event.target as Node)) {
        setShowLearnDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Scroll state logic
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Signed out successfully",
      });
      setMobileMenuOpen(false);
    }
  };

  const isHomePage = location.pathname === "/" || location.pathname === "/sandbox";

  return (
    <div className={`up-header-outer-wrapper ${isHomePage ? "is-home" : ""}`}>
      <div className={`up-header-container ${isScrolled ? "is-scrolled" : ""}`} ref={headerRef}>

        {/* 1. TOP UTILITY BAR: OFFICIAL GOVERNMENT BANNER */}
        <div className="up-header__top">
          <div className="up-header__top__emergencyInfo">
            <img src={lambangHeader} alt="Lambang OPT" className="w-4 h-4 object-contain mr-2" />
            <span className="text-slate-300 mr-1">Website Resmi</span>
            <span className="up-header__top__emergencyInfo--yellow">Pemerintah Kabupaten Kotawaringin Barat</span>

            {/* Domain Info Popover */}
            <div className="relative inline-block ml-3" ref={learnRef}>
              <button
                onClick={() => setShowLearnDropdown(!showLearnDropdown)}
                className="bg-transparent border-0 text-slate-300 hover:text-white flex items-center gap-0.5 cursor-pointer text-xs font-semibold underline"
              >
                Pelajari <Info className="w-3 h-3" />
              </button>
              {showLearnDropdown && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white text-slate-800 rounded-lg shadow-2xl border border-slate-200 z-[1002] p-4 text-xs font-sans">
                  <div className="mb-2">
                    <span className="font-bold text-blue-900 block">Domain Resmi .go.id</span>
                    <span>Portal ini menggunakan domain resmi pemerintah Kabupaten Kotawaringin Barat.</span>
                  </div>
                  <div>
                    <span className="font-bold text-blue-900 block">Koneksi Aman (HTTPS)</span>
                    <span>Transmisi data dilindungi enkripsi SSL (Secure Sockets Layer) berstandar industri.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="up-header__top__quickUtility">
            <div className="up-header__top__basicLinks">
              <a href="https://kotawaringinbaratkab.go.id" target="_blank" rel="noopener noreferrer" className="up-header__top__quickUtility__link">Portal Utama</a>
              <a href="#" className="up-header__top__quickUtility__link">Kebijakan Privasi</a>
              <a href="#" className="up-header__top__quickUtility__link">Kontak Dinas</a>
            </div>
          </div>
        </div>

        {/* 2. MAIN HEADER BAR */}
        <div className="up-header__main">
          {/* Logo Box */}
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="up-header__main__logo" title="Open Data Kobar">
            <img src={logo} alt="Logo Open Data" className="h-12 w-auto object-contain" />
          </a>

          {/* Brand Title (Open Data beside Logo Box) */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate("/"); }}
            className="up-header__main__brand"
            title="Open Data Kobar"
          >
            <span className="up-header__main__title">Open Data</span>
            <span className="up-header__main__subtitle">Kabupaten Kotawaringin Barat</span>
          </a>

          {/* Main Navigation (Only Dataset List) */}
          <nav className={`up-header__main__nav ${mobileMenuOpen ? "is-open" : ""}`}>
            <ul className="up-header__main__menu">
              <li className="up-header__main__menuItem">
                <a
                  href="/dataset-list"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/dataset-list");
                    setMobileMenuOpen(false);
                  }}
                  className="up-header__main__menuItem__link w-full py-4 lg:py-0 border-b lg:border-b-0 border-gray-100 text-left text-lg lg:text-sm font-semibold"
                >
                  <List className="w-4 h-4 mr-1.5 hidden" />
                  Dataset List
                </a>
              </li>
            </ul>
          </nav>

          {/* User Sign In / Profile Section */}
          {user ? (
            <div className="up-header__main__cta flex items-center gap-2 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 text-yellow-900 px-3 py-1.5 rounded-lg text-[13px] font-bold">
              <Shield className="w-4 h-4 text-amber-600 animate-none" />
              <div className="flex flex-col text-left leading-none font-sans">
                <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">
                  {orgRoles.find(r => ['ADMIN', 'WALIDATA'].includes(r.code))?.name ||
                    orgRoles.find(r => ['KOORDINATOR', 'PRODUSEN'].includes(r.code))?.name ||
                    'Administrator'}
                </span>
                <span className="text-slate-800 font-bold truncate max-w-[120px]">{user.email}</span>
              </div>
              <div className="h-4 w-px bg-yellow-300 mx-1" />
              {canAccessAdmin ? (
                <>
                  <a href="/admin" onClick={(e) => { e.preventDefault(); navigate("/admin"); }} className="text-blue-900 hover:underline flex items-center gap-0.5">
                    Panel
                  </a>
                  <span className="text-yellow-400">|</span>
                </>
              ) : (
                <>
                  <a href="/admin/profile" onClick={(e) => { e.preventDefault(); navigate("/admin/profile"); }} className="text-blue-900 hover:underline flex items-center gap-0.5">
                    Profil
                  </a>
                  <span className="text-yellow-400">|</span>
                </>
              )}
              <button onClick={handleSignOut} className="text-red-700 hover:underline bg-transparent border-0 cursor-pointer flex items-center p-0">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="up-header__main__cta flex items-center justify-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 border-0 font-bold px-4 py-2 rounded-lg cursor-pointer text-sm"
            >
              <User className="w-4 h-4" />
              Masuk (Sign In)
            </button>
          )}

          {/* Mobile Hamburger menu toggle button */}
          <button
            className={`up-header__main__hamburger ${mobileMenuOpen ? "is-open" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            Menu
            <span className="up-header__main__hamburger--icon">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
