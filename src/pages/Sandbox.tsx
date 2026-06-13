import React, { useState } from "react";
import { Link } from "react-router-dom";
import UnionPacificHeader from "@/components/UnionPacificHeader/UnionPacificHeader";
import heroImage from "@/assets/sky-hero-03.png";
import recentBgImage from "@/assets/hero-footer02-01.png";
import { Search, Database, TrendingUp, Clock, Globe, ArrowLeft, RefreshCw, Tag, Calendar, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";

// Static Mock Datasets (Lorem Ipsum)
const mockPopularDatasets = [
  {
    id: "lorem-1",
    slug: "lorem-ipsum-dataset-1",
    title: "Lorem Ipsum Dolor Sit Amet",
    source: "Dinas Lorem Kabupaten Ipsum",
    category: "Ekonomi",
    description: "Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud.",
    tags: ["lorem", "ipsum", "dolor"],
    downloadCount: 1337,
    lastUpdated: "2 jam yang lalu",
    size: "1.2 MB",
    format: "CSV",
    is_priority: true
  },
  {
    id: "lorem-2",
    slug: "lorem-ipsum-dataset-2",
    title: "Consectetur Adipiscing Elit",
    source: "Dinas Dolor Kabupaten Sit",
    category: "Kesehatan",
    description: "Tempor incididunt ut labore et dolore magna aliqua. Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.",
    tags: ["adipiscing", "elit", "consectetur"],
    downloadCount: 984,
    lastUpdated: "1 hari yang lalu",
    size: "840 KB",
    format: "JSON",
    is_priority: false
  },
  {
    id: "lorem-3",
    slug: "lorem-ipsum-dataset-3",
    title: "Sed Do Eiusmod Tempor Incididunt",
    source: "Dinas Amet Kabupaten Consectetur",
    category: "Pemerintahan",
    description: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure.",
    tags: ["tempor", "incididunt", "labore"],
    downloadCount: 742,
    lastUpdated: "3 hari yang lalu",
    size: "2.4 MB",
    format: "XML",
    is_priority: false
  }
];

const mockRecentDatasets = [
  {
    id: "lorem-4",
    slug: "lorem-ipsum-dataset-4",
    title: "Ut Enim Ad Minim Veniam",
    source: "Dinas Adipiscing Kabupaten Elit",
    category: "Infrastruktur",
    description: "Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in.",
    tags: ["veniam", "nostrud", "exercitation"],
    downloadCount: 320,
    lastUpdated: "10 menit yang lalu",
    size: "3.1 MB",
    format: "CSV",
    is_priority: true
  },
  {
    id: "lorem-5",
    slug: "lorem-ipsum-dataset-5",
    title: "Quis Nostrud Exercitation Ullamco",
    source: "Dinas Laboris Kabupaten Nisi",
    category: "Lingkungan",
    description: "Ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse.",
    tags: ["laboris", "nisi", "ullamco"],
    downloadCount: 154,
    lastUpdated: "1 jam yang lalu",
    size: "450 KB",
    format: "PDF",
    is_priority: false
  },
  {
    id: "lorem-6",
    slug: "lorem-ipsum-dataset-6",
    title: "Laboris Nisi Ut Aliquip Ex Ea",
    source: "Dinas Aliquip Kabupaten Ut",
    category: "Kependudukan",
    description: "Commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    tags: ["aliquip", "commodo", "consequat"],
    downloadCount: 89,
    lastUpdated: "4 jam yang lalu",
    size: "1.5 MB",
    format: "CSV",
    is_priority: false
  }
];

const mockThemes = [
  { id: "t1", name: "Ekonomi", icon: Globe, count: 12 },
  { id: "t2", name: "Sosial", icon: Database, count: 8 },
  { id: "t3", name: "Pemerintahan", icon: TrendingUp, count: 15 },
  { id: "t4", name: "Infrastruktur", icon: Clock, count: 6 },
  { id: "t5", name: "Lingkungan", icon: Globe, count: 9 },
  { id: "t6", name: "Kependudukan", icon: Database, count: 11 }
];

export const Sandbox: React.FC = () => {
  const [demoRefreshKey, setDemoRefreshKey] = useState(0);

  const handleRefreshStock = () => {
    setDemoRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 antialiased font-sans">
      {/* Interactive Controls Bar */}
      <div className="bg-slate-900 text-white py-2 px-6 flex flex-wrap items-center justify-between gap-4 text-xs z-50 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center bg-blue-600 text-white rounded-full px-2.5 py-0.5 font-bold tracking-wider uppercase text-[10px]">
            Sandbox
          </span>
          <span className="text-slate-400 font-medium">Union Pacific Header Component Demo (Static Home Clone)</span>
        </div>

        <div className="flex items-center gap-6">
          {/* Back to Home Link */}
          <Link
            to="/"
            className="flex items-center gap-1.5 hover:text-blue-400 transition-colors font-semibold py-1 text-slate-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Open Data Portal
          </Link>

          <span className="w-px h-4 bg-slate-700" />

          {/* Refresh simulated stock value */}
          <button
            onClick={handleRefreshStock}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border-0 rounded px-2.5 py-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Reset State
          </button>
        </div>
      </div>

      {/* Main Header Integration */}
      <div key={demoRefreshKey} className="w-full">
        <UnionPacificHeader />
      </div>

      {/* Hero Section */}
      <main className="flex-grow">
        <div className="relative overflow-hidden bg-cover bg-center h-[540px] flex items-center justify-center" style={{ backgroundImage: `url(${heroImage})` }}>
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 to-slate-900/70" />

          <div className="relative container mx-auto px-6 max-w-4xl text-center text-white pt-28 md:pt-32">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight drop-shadow-sm font-outfit">
              Lorem Ipsum Dolor <br />
              <span className="text-yellow-400 font-normal italic">Sit Amet Consectetur</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-100 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>

            {/* Static Search Mockup */}
            <div className="w-full max-w-3xl mx-auto mb-12 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Lorem ipsum search datasets..."
                readOnly
                className="w-full pl-12 pr-24 py-4 text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl focus:outline-none cursor-not-allowed shadow-md text-base"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-sm cursor-not-allowed">
                Search
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                <Database className="w-4 h-4 text-yellow-400" />
                <span>6 Lorem Datasets</span>
              </div>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>3,237 Downloads</span>
              </div>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Updated Daily</span>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <section className="py-16 bg-[#87CDEC] border-t border-b border-sky-300/30">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">Browse by Category</h2>
              <p className="text-slate-700 text-base">Explore static mock datasets organized by topic and domain</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {mockThemes.map((theme) => {
                const IconComponent = theme.icon;
                return (
                  <button
                    key={theme.id}
                    className="flex flex-col items-center justify-center p-5 bg-white/90 hover:bg-white text-slate-800 rounded-2xl border border-sky-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 group cursor-not-allowed"
                  >
                    <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-center line-clamp-1">{theme.name}</span>
                    <span className="text-xs text-slate-500 mt-1">{theme.count} Datasets</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Popular Datasets Section */}
        <section className="py-16 bg-[#87CDEC]/50 border-b border-sky-300/20">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Popular Datasets</h2>
              <p className="text-slate-600 text-sm">Most downloaded mock datasets by the community</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mockPopularDatasets.map((dataset) => (
                <Card key={dataset.id} className="data-card group h-full flex flex-col bg-white border border-slate-200 shadow-sm rounded-xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base font-bold line-clamp-2 text-slate-900 group-hover:text-blue-600 transition-colors">
                          {dataset.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-1">
                          {dataset.source}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {dataset.is_priority && (
                          <Badge variant="destructive" className="shrink-0 text-[10px] py-0.5 px-2 bg-red-600 border-0">
                            Priority Data
                          </Badge>
                        )}
                        <Badge variant="secondary" className="shrink-0 text-[10px] py-0.5 px-2 bg-slate-100 text-slate-700">
                          {dataset.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 pb-3">
                    <p className="text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                      {dataset.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {dataset.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] h-5 py-0 px-2 bg-slate-50 border-slate-200 text-slate-600">
                          <Tag className="w-2.5 h-2.5 mr-1 text-slate-400" />
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Download className="w-3.5 h-3.5 text-slate-400" />
                          {dataset.downloadCount.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {dataset.lastUpdated}
                        </div>
                      </div>
                      <div>
                        {dataset.size} &bull; {dataset.format}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 pb-4">
                    <Button
                      className="w-full text-xs font-semibold py-2 h-9 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-not-allowed"
                      variant="outline"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      View Dataset
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Recently Added Section */}
        <section className="relative overflow-hidden bg-slate-900">
          <div className="absolute inset-0">
            <img
              src={recentBgImage}
              alt="Recent datasets and footer background"
              className="w-full h-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/20" />
          </div>

          <div className="relative z-10">
            <div className="container mx-auto px-6 py-16 max-w-6xl">
              <div className="mb-10 text-center md:text-left text-white">
                <h2 className="text-3xl font-bold tracking-tight mb-2">Recently Added</h2>
                <p className="text-slate-300 text-sm">Latest mock datasets uploaded to the platform</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                {mockRecentDatasets.map((dataset) => (
                  <Card key={dataset.id} className="data-card group h-full flex flex-col bg-white border border-slate-200 shadow-sm rounded-xl">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-base font-bold line-clamp-2 text-slate-900 group-hover:text-blue-600 transition-colors">
                            {dataset.title}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500 mt-1">
                            {dataset.source}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {dataset.is_priority && (
                            <Badge variant="destructive" className="shrink-0 text-[10px] py-0.5 px-2 bg-red-600 border-0">
                              Priority Data
                            </Badge>
                          )}
                          <Badge variant="secondary" className="shrink-0 text-[10px] py-0.5 px-2 bg-slate-100 text-slate-700">
                            {dataset.category}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 pb-3">
                      <p className="text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                        {dataset.description}
                      </p>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {dataset.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] h-5 py-0 px-2 bg-slate-50 border-slate-200 text-slate-600">
                            <Tag className="w-2.5 h-2.5 mr-1 text-slate-400" />
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Download className="w-3.5 h-3.5 text-slate-400" />
                            {dataset.downloadCount.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {dataset.lastUpdated}
                          </div>
                        </div>
                        <div>
                          {dataset.size} &bull; {dataset.format}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0 pb-4">
                      <Button
                        className="w-full text-xs font-semibold py-2 h-9 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-not-allowed"
                        variant="outline"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        View Dataset
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>

            {/* Layout Footer */}
            <Footer />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Sandbox;
