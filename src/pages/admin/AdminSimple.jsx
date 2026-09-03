import React from "react";
import { AdminLayout } from "../../components/AdminLayout";
import { db } from "../../lib/db";
import { motion } from "framer-motion";

export function AdminSimple({title}){
  const products = db.getProducts();
  return <AdminLayout>
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>{title}</h1>
        <p>Manage your {title.toLowerCase()}.</p>
      </div>
      <div className="admin-table">
        <div className="table-head">
          <b>Name / ID</b>
          <b>Status</b>
          <b>Action</b>
        </div>
        {products.map((p, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="table-row" 
            key={p.id}
          >
            <span>{p.name}</span>
            <span className="status">Active</span>
            <button className="mini">Edit</button>
          </motion.div>
        ))}
      </div>
    </div>
  </AdminLayout>
}
