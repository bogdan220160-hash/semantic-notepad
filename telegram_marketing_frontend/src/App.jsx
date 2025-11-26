import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  Users,
  FileText,
  MessageSquare,
  Clock,
  Filter,
  PlayCircle,
  BarChart2,
  Calendar,
  Activity,
  Globe,
  Code,
  Search,
  FlaskConical,
  Inbox as InboxIcon,
  Droplets
} from 'lucide-react';

import { useLanguage, LanguageProvider } from './context/LanguageContext';

import Accounts from './pages/Accounts';
import Lists from './pages/Lists';
import Messages from './pages/Messages';
import Delay from './pages/Delay';
import Filters from './pages/Filters';
import CampaignControl from './pages/CampaignControl';
import Logs from './pages/Logs';
import Analytics from './pages/Analytics';
import CalendarPage from './pages/Calendar';
import API from './pages/API';
import Scraper from './pages/Scraper';
import ABTest from './pages/ABTest';
import Inbox from './pages/Inbox';
import DripCampaigns from './pages/DripCampaigns';

function NavItem({ to, icon: Icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
        : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
        }`}
    >
      <Icon size={20} className={`transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
      <span className="font-medium tracking-wide">{label}</span>
    </Link>
  );
}

function Layout({ children }) {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800/50 backdrop-blur-xl border-r border-gray-700/50 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-gray-700/50">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 flex items-center space-x-3">
            <Activity className="text-blue-500" />
            <span>TG Marketing</span>
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <NavItem to="/" icon={Users} label={t('accounts')} />
          <NavItem to="/lists" icon={FileText} label={t('lists')} />
          <NavItem to="/messages" icon={MessageSquare} label={t('messages')} />
          <NavItem to="/scraper" icon={Search} label={t('scraper') || "Scraper"} />
          <NavItem to="/ab-test" icon={FlaskConical} label={t('abTesting') || "A/B Testing"} />
          <NavItem to="/inbox" icon={InboxIcon} label={t('inbox') || "Inbox"} />
          <NavItem to="/drip" icon={Droplets} label="Drip Campaigns" />
          <NavItem to="/delay" icon={Clock} label={t('delay')} />
          <NavItem to="/filters" icon={Filter} label={t('filters')} />
          <NavItem to="/campaign" icon={PlayCircle} label={t('campaigns')} />
          <NavItem to="/logs" icon={Code} label={t('logs')} />
          <NavItem to="/analytics" icon={BarChart2} label={t('analytics')} />
          <NavItem to="/calendar" icon={Calendar} label={t('calendar') || "Calendar"} />
          <NavItem to="/api" icon={Code} label={t('api')} />
        </nav>

        <div className="p-4 border-t border-gray-700/50">
          <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-2 mb-4">
            <Globe size={16} className="text-gray-400 ml-2" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-sm text-gray-300 focus:outline-none cursor-pointer text-right appearance-none pr-2"
              style={{ colorScheme: 'dark' }}
            >
              <option value="en" className="bg-gray-800 text-gray-300">English</option>
              <option value="ru" className="bg-gray-800 text-gray-300">Русский</option>
              <option value="uk" className="bg-gray-800 text-gray-300">Українська</option>
            </select>
          </div>
          <div className="text-xs text-gray-500 text-center">
            v1.0.0 • Premium Edition
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto relative bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        {/* Ambient Background Glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Accounts />} />
            <Route path="/lists" element={<Lists />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/scraper" element={<Scraper />} />
            <Route path="/ab-test" element={<ABTest />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/drip" element={<DripCampaigns />} />
            <Route path="/delay" element={<Delay />} />
            <Route path="/filters" element={<Filters />} />
            <Route path="/campaign" element={<CampaignControl />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/api" element={<API />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </LanguageProvider>
  );
}

export default App;
