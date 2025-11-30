import React from 'react';
import type { ReactNode } from 'react';
import Sidebar from '../components/Sidebar';
import './DashboardLayout.css';

interface DashboardLayoutProps {
    children: ReactNode;
    title: string;
    subtitle?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, subtitle }) => {
    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h1>{title}</h1>
                    {subtitle && <p>{subtitle}</p>}
                </div>
                <div className="dashboard-main">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
