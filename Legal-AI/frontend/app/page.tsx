"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import api from "@/lib/api";
import { Calendar, BookOpen, AlertCircle, Search, ExternalLink } from "lucide-react";

interface Judgment {
  title: string;
  text: string;
  link: string;
  date: string;
  category: string;
}

export default function Home() {
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [filteredJudgments, setFilteredJudgments] = useState<Judgment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchJudgments = async () => {
    try {
      // Fetch from backend API
      const response = await api.get("/judgments/live");
      setJudgments(response.data);
      setFilteredJudgments(response.data);
    } catch (error) {
      console.error("Failed to fetch judgments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJudgments();
    const interval = setInterval(fetchJudgments, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredJudgments(judgments);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = judgments.filter(item =>
        item.category.toLowerCase().includes(lowerQuery) ||
        item.title.toLowerCase().includes(lowerQuery) ||
        item.text.toLowerCase().includes(lowerQuery)
      );
      setFilteredJudgments(filtered);
    }
  }, [searchQuery, judgments]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            Legal Assistant Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time updates from Supreme Court of India
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20">
          New Case Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <BookOpen size={24} />
            <span className="font-semibold">Live Judgments</span>
          </div>
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{judgments.length}</div>
          <p className="text-xs text-slate-500 mt-1">Updates this week</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 text-purple-500 mb-2">
            <Calendar size={24} />
            <span className="font-semibold">Upcoming Hearings</span>
          </div>
          <div className="text-3xl font-bold text-slate-800 dark:text-white">5</div>
          <p className="text-xs text-slate-500 mt-1">Scheduled for next 7 days</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <AlertCircle size={24} />
            <span className="font-semibold">Pending Drafts</span>
          </div>
          <div className="text-3xl font-bold text-slate-800 dark:text-white">2</div>
          <p className="text-xs text-slate-500 mt-1">Requires attention</p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Latest Supreme Court Verdicts
            <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Live Feed</span>
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search (e.g. Criminal, Civil)..."
              className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
            ))
          ) : (
            filteredJudgments.map((item, index) => (
              <a key={index} href={item.link} target="_blank" rel="noopener noreferrer">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer relative overflow-hidden h-full mb-4"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="pl-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-500 transition-colors pr-10">
                        {item.title}
                      </h3>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {item.date}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${item.category === 'Criminal' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                            item.category === 'Civil' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                      {item.text}
                    </p>
                    <div className="mt-2 flex items-center text-blue-500 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Read Judgment <ExternalLink size={12} className="ml-1" />
                    </div>
                  </div>
                </motion.div>
              </a>
            ))
          )}
          {!loading && filteredJudgments.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              No judgments found based on your search.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
