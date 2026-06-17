import React, { useState, useEffect, useRef } from "react";
import { User, Menu, X, ChevronDown, Shield, LogOut, Info, ExternalLink, Plus, Minus } from "lucide-react";
import logo from "@/assets/logo.png";
import lambangHeader from "@/assets/lambang_opt.png";
import "./UnionPacificHeader.css";

// Navigation Structure
interface NavSubItem {
  title: string;
  path: string;
  description: string;
}

interface NavSubmenu {
  label: string;
  items: NavSubItem[];
}

interface NavItem {
  title: string;
  hasSubmenu: boolean;
  path?: string;
  submenus?: NavSubmenu[];
}

const navData: NavItem[] = [
  {
    title: "Kategori Data",
    hasSubmenu: true,
    submenus: [
      {
        label: "Ekonomi & Pembangunan",
        items: [
          { title: "Koperasi & UMKM", path: "/dataset-list?theme=Koperasi", description: "Data perkembangan usaha mikro, kecil, menengah dan koperasi daerah." },
          { title: "Pertanian & Ketahanan Pangan", path: "/dataset-list?theme=Pertanian", description: "Statistik produksi komoditas pangan, perkebunan, dan peternakan." },
          { title: "Keuangan & Pendapatan Daerah", path: "/dataset-list?theme=Keuangan", description: "Realisasi anggaran belanja, pendapatan daerah, dan pajak daerah." },
          { title: "Perdagangan & Perindustrian", path: "/dataset-list?theme=Perdagangan", description: "Data harga bahan pokok, pasar tradisional, dan izin usaha industri." }
        ]
      },
      {
        label: "Sosial & Kependudukan",
        items: [
          { title: "Kesehatan Masyarakat", path: "/dataset-list?theme=Kesehatan", description: "Data faskes, sebaran tenaga kesehatan, dan status kesehatan publik." },
          { title: "Pendidikan & Kebudayaan", path: "/dataset-list?theme=Pendidikan", description: "Statistik sekolah, jumlah guru, siswa, dan cagar budaya daerah." },
          { title: "Kependudukan & Capil", path: "/dataset-list?theme=Kependudukan", description: "Jumlah penduduk berdasarkan kecamatan, usia, dan kartu identitas." },
          { title: "Ketenagakerjaan & Sosial", path: "/dataset-list?theme=Sosial", description: "Angka pengangguran, bantuan sosial, dan penerima jaminan sosial." }
        ]
      },
      {
        label: "Pemerintahan & Hukum",
        items: [
          { title: "Kepegawaian Daerah (BKPSDM)", path: "/dataset-list", description: "Statistik Aparatur Sipil Negara berdasarkan pangkat, golongan, dan instansi." },
          { title: "Hukum & Produk Regulasi", path: "/dataset-list", description: "Daftar Peraturan Daerah (Perda) dan Keputusan Bupati Kabupaten Kobar." },
          { title: "Pelayanan Publik & Informasi", path: "/dataset-list", description: "Statistik indeks kepuasan masyarakat terhadap layanan dinas daerah." }
        ]
      },
      {
        label: "Infrastruktur & Lingkungan",
        items: [
          { title: "Pekerjaan Umum & Penataan Ruang", path: "/dataset-list", description: "Panjang jalan mantap, jembatan, irigasi, dan status tata ruang." },
          { title: "Perhubungan & Transportasi", path: "/dataset-list", description: "Data rute angkutan, uji kelayakan kendaraan, dan statistik terminal." },
          { title: "Lingkungan Hidup & Kebersihan", path: "/dataset-list", description: "Volume sampah harian, indeks kualitas udara, dan luas ruang terbuka hijau." }
        ]
      }
    ]
  },
  {
    title: "Tentang Kami",
    hasSubmenu: true,
    submenus: [
      {
        label: "Informasi Portal",
        items: [
          { title: "Profil Open Data Kobar", path: "#", description: "Inisiatif keterbukaan data Kabupaten Kotawaringin Barat berdasarkan Satu Data Indonesia." },
          { title: "Dasar Hukum", path: "#", description: "Landasan regulasi pelaksanaan Satu Data tingkat pusat dan daerah." }
        ]
      },
      {
        label: "Hubungi & Layanan",
        items: [
          { title: "Dinas Kominfo Kobar", path: "#", description: "Kontak pengelola portal, alamat kantor, dan saluran aduan resmi." },
          { title: "Permohonan Data Khusus", path: "#", description: "Panduan cara mengajukan permohonan data yang belum tersedia publik." }
        ]
      }
    ]
  },
  {
    title: "Dataset List",
    hasSubmenu: false,
    path: "/dataset-list"
  }
];

export const UnionPacificHeader: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMobileSubcategory, setActiveMobileSubcategory] = useState<string | null>(null);

  // Simulated Auth State
  const [isAdminSimulated, setIsAdminSimulated] = useState(true);
  const [showLearnDropdown, setShowLearnDropdown] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const learnRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
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

  const handleNavClick = (menuTitle: string, hasSubmenu: boolean) => {
    if (!hasSubmenu) {
      setActiveMenu(null);
      return;
    }
    if (activeMenu === menuTitle) {
      setActiveMenu(null);
    } else {
      setActiveMenu(menuTitle);
    }
  };

  const handleMobileSubcategoryClick = (label: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing parent menu
    if (activeMobileSubcategory === label) {
      setActiveMobileSubcategory(null);
    } else {
      setActiveMobileSubcategory(label);
    }
  };

  return (
    <div className="up-header-outer-wrapper">
      {/* Simulation Toggle float overlay on the top corner of screen */}
      <div className="fixed bottom-4 right-4 z-[9999] bg-white border border-slate-200 p-3 rounded-lg shadow-xl flex flex-col gap-2 text-xs font-semibold">
        <div className="text-slate-500 uppercase tracking-wider text-[9px] mb-1">Simulasi Skenario</div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isAdminSimulated}
            onChange={(e) => setIsAdminSimulated(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <span>Masuk Sebagai Admin (Walidata)</span>
        </label>
      </div>

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
                <div className="absolute left-0 top-full mt-2 w-72 bg-white text-slate-800 rounded-lg shadow-2xl border border-slate-200 z-[1002] p-4 text-xs">
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
          {/* Logo Box - local logo.png */}
          <a href="#" className="up-header__main__logo" title="Open Data Kobar" style={{ backgroundColor: "#FFFFFF" }}>
            <img src={logo} alt="Logo Open Data" className="h-12 w-auto object-contain" />
          </a>

          {/* Main Navigation (Desktop centered, mobile side-drawer) */}
          <nav className={`up-header__main__nav ${mobileMenuOpen ? "is-open" : ""}`}>
            <ul className="up-header__main__menu">
              {navData.map((item) => (
                <li
                  key={item.title}
                  className={`up-header__main__menuItem ${activeMenu === item.title ? "is-active" : ""}`}
                  onMouseEnter={() => {
                    if (window.innerWidth > 1024) setActiveMenu(item.title);
                  }}
                  onMouseLeave={() => {
                    if (window.innerWidth > 1024) setActiveMenu(null);
                  }}
                >
                  {item.hasSubmenu ? (
                    <>
                      {/* Desktop Menu Link */}
                      <button
                        className="up-header__main__menuItem__link bg-transparent border-0 hidden lg:flex"
                        onClick={() => handleNavClick(item.title, true)}
                      >
                        {item.title}
                        <span className="up-header__main__menuItem__link--chevron" />
                      </button>

                      {/* Mobile Accordion Menu Header */}
                      <button
                        className="w-full flex lg:hidden items-center justify-between bg-transparent border-0 text-left cursor-pointer py-4 font-semibold text-blue-900 text-lg border-b border-gray-100"
                        onClick={() => handleNavClick(item.title, true)}
                      >
                        {item.title}
                        <ChevronDown className={`w-5 h-5 text-blue-900 transition-transform duration-200 ${activeMenu === item.title ? "transform rotate-180" : ""}`} />
                      </button>

                      {/* Desktop Submenu (Mega Dropdown) & Mobile Submenu Accordions */}
                      <div className="up-header__main__subNav">
                        <ul className="up-header__main__submenu">
                          {item.submenus?.map((sub) => (
                            <li key={sub.label} className="up-header__main__submenuItem">
                              {/* Desktop static header */}
                              <div className="up-header__main__submenuItem__label hidden lg:block">
                                {sub.label}
                              </div>

                              {/* Mobile Sub-Accordion Toggle */}
                              <button
                                className="w-full flex lg:hidden items-center justify-between bg-transparent border-0 text-left cursor-pointer font-bold text-blue-900 border-b border-gray-100 pb-2.5 text-sm mt-3"
                                onClick={(e) => handleMobileSubcategoryClick(sub.label, e)}
                              >
                                {sub.label}
                                {activeMobileSubcategory === sub.label ? (
                                  <Minus className="w-4 h-4 text-blue-900" />
                                ) : (
                                  <Plus className="w-4 h-4 text-blue-900" />
                                )}
                              </button>

                              {/* Category Links List */}
                              <ul className={`up-header__main__submenuItem__list ${activeMobileSubcategory === sub.label ? "block" : "hidden lg:flex"}`}>
                                {sub.items.map((subLink) => (
                                  <li key={subLink.title}>
                                    <a href={subLink.path} className="up-header__main__submenuItem__link">
                                      <span className="flex items-center gap-1 hover:underline text-[#00339A] font-semibold">
                                        {subLink.title}
                                      </span>
                                      <span className="up-header__main__submenuItem__text">
                                        {subLink.description}
                                      </span>
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <a
                      href={item.path || "#"}
                      className="up-header__main__menuItem__link w-full py-4 lg:py-0 border-b lg:border-b-0 border-gray-100 text-left text-lg lg:text-sm font-semibold lg:font-semibold"
                      onClick={() => {
                        setActiveMenu(null);
                        setMobileMenuOpen(false);
                      }}
                    >
                      {item.title}
                    </a>
                  )}
                </li>
              ))}
            </ul>

          </nav>

          {/* User Sign In / Profile Section (Positioned on the far right on desktop) */}
          {isAdminSimulated ? (
            <div className="up-header__main__cta flex items-center gap-2 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 text-yellow-900 px-3 py-1.5 rounded-lg text-[13px] font-bold">
              <Shield className="w-4 h-4 text-amber-600" />
              <div className="flex flex-col text-left leading-none">
                <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">Walidata (Admin)</span>
                <span className="text-slate-800 font-bold truncate max-w-[120px]">admin@kobar.go.id</span>
              </div>
              <div className="h-4 w-px bg-yellow-300 mx-1" />
              <a href="/admin" className="text-blue-900 hover:underline flex items-center gap-0.5">
                Panel
              </a>
              <span className="text-yellow-400">|</span>
              <button onClick={() => setIsAdminSimulated(false)} className="text-red-700 hover:underline bg-transparent border-0 cursor-pointer flex items-center p-0">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdminSimulated(true)}
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

export default UnionPacificHeader;
