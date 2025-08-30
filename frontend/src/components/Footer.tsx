import React from "react";

const Footer: React.FC = () => (
    <footer className="w-full bg-gray-100 text-gray-700 py-6 px-4 mt-8 border-t flex flex-col items-center text-center gap-2 sm:flex-row sm:justify-between sm:items-center sm:text-left">
        <div className="flex flex-col items-center sm:items-start">
            <span className="font-medium">Interested in a specific use case related to this? </span>
        </div>
        <div className="flex flex-col items-center gap-1 sm:items-end">
            <div className="flex items-center gap-2">
                <span role="img" aria-label="phone">📞</span>
                <a href="tel:+918469108864" className="hover:underline">+91 84691 08864</a>
            </div>
            <div className="flex items-center gap-2">
                <span role="img" aria-label="email">✉️</span>
                <a href="mailto:darshanparmar.dev@gmail.com" className="hover:underline">darshanparmar.dev@gmail.com</a>
            </div>
        </div>
    </footer>
);

export default Footer;
