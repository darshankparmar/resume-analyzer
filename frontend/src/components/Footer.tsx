import React from "react";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Footer: React.FC = () => (
    <footer className="bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 text-white py-12 px-4 mt-20">
        <div className="container mx-auto max-w-8xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

                {/* Left Section */}
                <div className="text-center lg:text-left space-y-4">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                        Need a Custom Solution?
                    </h3>
                    <p className="text-blue-100 text-lg leading-relaxed">
                        Interested in a specific use case related to this?
                        <br />
                        Let's discuss how we can help optimize your hiring process.
                    </p>
                </div>

                {/* Right Section - Contact Cards */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Phone Card */}
                        <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 rounded-xl hover:bg-white/20 transition-all duration-300 group">
                            <a
                                href="tel:+918469108864"
                                className="flex items-center gap-3 text-white hover:text-blue-300 transition-colors"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Phone className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-blue-200">Call Us</div>
                                    <div className="font-semibold">+91 84691 08864</div>
                                </div>
                            </a>
                        </Card>

                        {/* Email Card */}
                        <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20 rounded-xl hover:bg-white/20 transition-all duration-300 group">
                            <a
                                href="mailto:darshanparmar.dev@gmail.com"
                                className="flex items-center gap-3 text-white hover:text-blue-300 transition-colors"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Mail className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-blue-200">Email Us</div>
                                    <div className="font-semibold text-sm">darshanparmar.dev@gmail.com</div>
                                </div>
                            </a>
                        </Card>
                    </div>

                    {/* Quick Contact Button */}
                    <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        onClick={() => window.open('mailto:darshanparmar.dev@gmail.com?subject=Custom Resume Analyzer Solution', '_blank')}
                    >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Get in Touch
                    </Button>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="mt-8 pt-8 border-t border-white/20">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
                    <div className="text-blue-200">
                        © 2025 Resume Analyzer. Built with ❤️ for job seekers.
                    </div>
                    {/* <div className="flex items-center gap-6 text-sm text-blue-300">
                        <span>AI-Powered Analysis</span>
                        <span>•</span>
                        <span>Privacy Focused</span>
                        <span>•</span>
                        <span>Mobile First</span>
                    </div> */}
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;