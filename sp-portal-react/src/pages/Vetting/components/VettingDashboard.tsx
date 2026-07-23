'use client';

import { useMemo } from 'react';
import { PortalLayout } from '../../../layout/PortalLayout';
import '../styles/vetting-dashboard.css';

// Dashboard MVP: 3 charts per debate gate condition
// 1. Stage distribution (pie chart)
// 2. Overall progress bar
// 3. Officer workload (bar chart)

interface CandidateRecord {
  id: string;
  name: string;
  status: 'application' | 'pre-screen' | 'interview' | 'documents' | 'active' | 'rejected';
  checks?: boolean[];
  stepApprovals?: boolean[];
  assignedOfficer?: string;
}

interface VettingDashboardProps {
  candidates?: CandidateRecord[];
}

export function VettingDashboard({ candidates = [] }: VettingDashboardProps) {
  // Calculate stage distribution
  const stageDistribution = useMemo(() => {
    const stages = {
      Application: 0,
      'Pre-screen': 0,
      Interview: 0,
      Documents: 0,
      Active: 0,
      Rejected: 0,
    };

    candidates.forEach((c) => {
      const status = c.status || 'application';
      const normalized =
        status === 'application'
          ? 'Application'
          : status === 'pre-screen'
            ? 'Pre-screen'
            : status === 'interview'
              ? 'Interview'
              : status === 'documents'
                ? 'Documents'
                : status === 'active'
                  ? 'Active'
                  : 'Rejected';
      stages[normalized as keyof typeof stages]++;
    });

    return Object.entries(stages).map(([name, count]) => ({
      name,
      count,
      percentage: candidates.length > 0 ? ((count / candidates.length) * 100).toFixed(1) : '0',
    }));
  }, [candidates]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (candidates.length === 0) return '0.0';
    const totalChecks = candidates.reduce((sum, c) => {
      const checkCount = (c.checks || []).filter(Boolean).length;
      const maxChecks = (c.checks || []).length || 50;
      return sum + (maxChecks > 0 ? (checkCount / maxChecks) * 100 : 0);
    }, 0);
    return (totalChecks / candidates.length).toFixed(1);
  }, [candidates]);

  // Calculate officer workload
  const officerWorkload = useMemo(() => {
    const workload: Record<string, number> = {};
    candidates.forEach((c) => {
      const officer = c.assignedOfficer || 'Unassigned';
      workload[officer] = (workload[officer] || 0) + 1;
    });

    return Object.entries(workload)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [candidates]);

  return (
    <PortalLayout mainClassName="vetting-container container-fluid px-3 px-lg-4 py-4" title="Vetting Dashboard">
      <div className="vetting-dashboard">
        <header className="dashboard-header">
          <h1>Vetting Dashboard</h1>
          <p className="subtitle">Real-time metrics and progress tracking</p>
          <p className="timestamp">Last updated: {new Date().toLocaleTimeString()}</p>
        </header>

        {candidates.length === 0 ? (
          <div className="no-data">
            <p>No candidate data available. Start adding candidates to see metrics.</p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {/* Card 1: Overall Progress */}
            <div className="dashboard-card progress-card">
              <h2>Overall Progress</h2>
              <div className="progress-metric">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${overallProgress}%` }}
                    role="progressbar"
                    aria-valuenow={parseFloat(overallProgress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  ></div>
                </div>
                <p className="progress-text">
                  <strong>{overallProgress}%</strong> complete
                </p>
              </div>
              <div className="progress-details">
                <p>Total candidates: {candidates.length}</p>
                <p>
                  Completed: {candidates.filter((c) => c.status === 'active').length} (approved)
                </p>
                <p>
                  Rejected: {candidates.filter((c) => c.status === 'rejected').length}
                </p>
              </div>
            </div>

            {/* Card 2: Stage Distribution */}
            <div className="dashboard-card distribution-card">
              <h2>Stage Distribution</h2>
              <div className="stage-list">
                {stageDistribution.map((stage) => (
                  <div key={stage.name} className="stage-item">
                    <div className="stage-info">
                      <span className="stage-name">{stage.name}</span>
                      <span className="stage-count">{stage.count}</span>
                    </div>
                    <div className="stage-bar">
                      <div
                        className={`stage-fill stage-${stage.name.toLowerCase().replace('-', '_')}`}
                        style={{ width: `${stage.percentage}%` }}
                      ></div>
                    </div>
                    <span className="stage-percentage">{stage.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Officer Workload */}
            <div className="dashboard-card workload-card">
              <h2>Officer Workload</h2>
              <div className="officer-list">
                {officerWorkload.length === 0 ? (
                  <p className="empty-state">No assignments yet</p>
                ) : (
                  officerWorkload.map((officer) => (
                    <div key={officer.name} className="officer-item">
                      <div className="officer-info">
                        <span className="officer-name">{officer.name}</span>
                        <span className="officer-badge">{officer.count}</span>
                      </div>
                      <div className="officer-bar">
                        <div
                          className="officer-fill"
                          style={{
                            width: `${(officer.count / Math.max(...officerWorkload.map((o) => o.count), 1)) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
