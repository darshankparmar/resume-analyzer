import React from "react";

const Footer: React.FC = () => (
    <footer className="bg-white/50 backdrop-blur-xl border-t border-gray-200/50 mt-12">
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <div className="text-center sm:text-left">
                    <p className="font-medium text-gray-900 mb-1">
                        Need a custom solution?
                    </p>
                    <p className="text-sm text-gray-600">
                        Get in touch for enterprise features and API access
                    </p>
                </div>
                <div className="flex flex-col items-center gap-2 sm:items-end">
                    <a
                        href="tel:+918469108864"
                        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
                    >
                        <span className="text-lg">📞</span>
                        <span className="font-medium">+91 84691 08864</span>
                    </a>
                    <a
                        href="mailto:darshanparmar.dev@gmail.com"
                        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
                    >
                        <span className="text-lg">✉️</span>
                        <span className="font-medium">darshanparmar.dev@gmail.com</span>
                    </a>
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;
