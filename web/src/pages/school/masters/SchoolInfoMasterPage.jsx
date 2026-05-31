import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../../services/api';

const MASTER_CARDS = [
  {
    key: 'classes',
    title: 'Classes & Sections',
    description: 'Manage classes, sections, and class-section mappings',
    icon: '🏫',
    path: '/school/masters/classes',
    countEndpoint: '/api/school/masters/classes',
  },
  {
    key: 'subjects',
    title: 'Subjects',
    description: 'Configure subject list, subject groups, and electives',
    icon: '📖',
    path: '/school/masters/subjects',
    countEndpoint: '/api/school/masters/subjects',
  },
  {
    key: 'academic-year',
    title: 'Academic Year',
    description: 'Set up academic sessions, terms, and date ranges',
    icon: '📅',
    path: '/school/masters/academic-year',
    countEndpoint: '/api/school/masters/academic-years',
  },
  {
    key: 'holidays',
    title: 'Holidays',
    description: 'Manage public holidays, school events, and vacation calendar',
    icon: '🎉',
    path: '/school/masters/holidays',
    countEndpoint: '/api/school/masters/holidays',
  },
  {
    key: 'time-config',
    title: 'Time Configuration',
    description: 'Time blocks, periods, and weekly working schedule',
    icon: '⏰',
    path: '/school/masters/time-config',
    countEndpoint: '/api/school/masters/time-config/blocks',
  },
  {
    key: 'demographics',
    title: 'Demographics',
    description: 'Countries, states, cities, religions, communities, castes',
    icon: '🌍',
    path: '/school/masters/demographics',
    countEndpoint: '/api/school/masters/demographics/countries',
  },
  {
    key: 'houses',
    title: 'Houses',
    description: 'School houses for sports, activities, and grouping',
    icon: '🏠',
    path: '/school/masters/houses',
    countEndpoint: '/api/school/masters/houses',
  },
  {
    key: 'branches',
    title: 'Branches',
    description: 'Multi-branch campus configuration and settings',
    icon: '🏢',
    path: '/school/masters/branches',
    countEndpoint: '/api/school/masters/branches',
  },
];

export default function SchoolInfoMasterPage() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    setLoading(true);
    const results = {};
    await Promise.allSettled(
      MASTER_CARDS.map(async (card) => {
        try {
          const res = await api.get(card.countEndpoint);
          const data = res.data?.data || res.data;
          results[card.key] = Array.isArray(data) ? data.length : (res.data?.total || 0);
        } catch {
          results[card.key] = null;
        }
      })
    );
    setCounts(results);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0e3a5c]">School Masters</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure and manage all master data for your school
        </p>
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-[#0e3a5c] to-[#0891B2] rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Master Data Configuration</p>
            <p className="text-lg font-semibold mt-1">
              {Object.values(counts).filter((v) => v !== null).length} of {MASTER_CARDS.length} modules configured
            </p>
          </div>
          <div className="text-4xl opacity-50">⚙️</div>
        </div>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0891B2]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MASTER_CARDS.map((card) => (
            <NavLink
              key={card.key}
              to={card.path}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-[#0891B2]/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{card.icon}</span>
                {counts[card.key] !== null && counts[card.key] !== undefined && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0891B2]/10 text-[#0891B2]">
                    {counts[card.key]}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-[#0e3a5c] group-hover:text-[#0891B2] transition-colors">
                {card.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
              <div className="mt-3 flex items-center text-xs text-[#0891B2] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Configure →</span>
              </div>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
