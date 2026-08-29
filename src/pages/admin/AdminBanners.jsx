import React from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { ChevronRight, ArrowLeft } from "lucide-react";
import "./admin-pages.css";

export function AdminBanners() {
  return (
    <AdminLayout>
      <Link to="/admin" className="admin-back-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="admin-page-header">
        <div>
          <h1>Home Content</h1>
          <p className="admin-page-subtitle">Manage hero sliders and promotional campaign banners</p>
        </div>
      </div>
      
      <div className="admin-card" style={{padding: 0}}>
        <Link to="/admin/banners/hero" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', textDecoration: 'none', color: '#3b322c', borderBottom: '1px solid #f0ebe4'}}>
          <div>
            <b style={{display: 'block', fontSize: 16}}>Hero Images</b>
            <span style={{fontSize: 13, color: '#806f62'}}>Manage rotating hero banner images on the storefront home page</span>
          </div>
          <ChevronRight size={18} color="#a29286"/>
        </Link>
        <Link to="/admin/categories" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', textDecoration: 'none', color: '#3b322c', borderBottom: '1px solid #f0ebe4'}}>
          <div>
            <b style={{display: 'block', fontSize: 16}}>Shop Categories</b>
            <span style={{fontSize: 13, color: '#806f62'}}>Manage the shop by category section images and links</span>
          </div>
          <ChevronRight size={18} color="#a29286"/>
        </Link>
        <Link to="/admin/banners/promotions" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', textDecoration: 'none', color: '#3b322c'}}>
          <div>
            <b style={{display: 'block', fontSize: 16}}>Promotional Content</b>
            <span style={{fontSize: 13, color: '#806f62'}}>Create and manage promotional campaign cards for your storefront</span>
          </div>
          <ChevronRight size={18} color="#a29286"/>
        </Link>
      </div>
    </AdminLayout>
  );
}
