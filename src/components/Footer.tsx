import { Link } from "react-router-dom";
import { Database, Mail, Github, Twitter } from "lucide-react";
import lambangfooter from "@/assets/lambang_opt.png";

export const Footer = () => {
  return (
    <div className="relative container mx-auto px-6 py-16">
      <div className="bg-card/95 backdrop-blur-sm rounded-2xl border shadow-lg p-8 md:p-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img 
                src={lambangfooter}
                alt="Lambang OPT" 
                className="w-10 h-10 object-contain" 
              />              
              <span className="font-outfit text-lg font-bold">Open Data
                <span className="text-xs font-outfit font-thin block">Kabupaten Kotawaringin Barat</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Dinas Komunikasi Informatika, Statistik dan Persandian Kabupaten Kotawaringin Barat
              Jl. Sutan Syahrir No. 62, Pangkalan Bun, Kode Pos 74112
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/datasets" className="text-muted-foreground hover:text-foreground transition-colors">
                  Browse Datasets
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Use
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t mt-4 pt-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Dinas Komunikasi Informatika, Statistik dan Persandian Kabupaten Kotawaringin Barat</p>
        </div>
      </div>
    </div>
  );
};
