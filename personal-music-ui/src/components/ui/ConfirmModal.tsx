"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = "确认操作",
    message = "您确定要进行此操作吗？",
    confirmText = "确认",
    cancelText = "取消",
    type = "danger"
}: ConfirmModalProps) {
    const getIcon = () => {
        switch (type) {
            case "danger":
                return <AlertCircle className="text-red-500" size={28} />;
            case "warning":
                return <AlertCircle className="text-yellow-500" size={28} />;
            default:
                return <AlertCircle className="text-blue-500" size={28} />;
        }
    };

    const getConfirmButtonStyle = () => {
        switch (type) {
            case "danger":
                return "bg-red-600 hover:bg-red-500 text-white";
            case "warning":
                return "bg-yellow-600 hover:bg-yellow-500 text-white";
            default:
                return "bg-green-500 hover:bg-green-400 text-black";
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Box */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-sm bg-[#282828] border border-white/10 rounded-[28px] shadow-2xl overflow-hidden z-10"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-5 right-5 text-neutral-500 hover:text-white transition-colors p-1"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 pb-6 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                                {getIcon()}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
                            <p className="text-neutral-400 text-[13px] leading-relaxed px-2 font-medium">
                                {message}
                            </p>
                        </div>

                        <div className="p-6 pt-0 flex gap-3 px-8 pb-8">
                            <button
                                onClick={onClose}
                                className="flex-1 px-6 py-3.5 rounded-full text-sm font-bold text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10 active:scale-95"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className={`flex-1 px-6 py-3.5 rounded-full text-sm font-bold transition-all active:scale-95 shadow-xl ${getConfirmButtonStyle()}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
