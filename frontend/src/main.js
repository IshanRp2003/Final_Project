import axios from 'axios';
import './style.css';

const API_URL = 'http://localhost:8080/api';

// Axios Instance
const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth Functions
// Auth Functions
export const login = async (email, password) => {
    try {
        const response = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', response.data.token);

        // Store user info including role
        const user = {
            name: response.data.name,
            role: response.data.role,
            email: email,
            agentId: response.data.agentId // Ensure agentId is stored if available
        };
        localStorage.setItem('user', JSON.stringify(user));

        // Check for redirect param
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect');

        if (redirectUrl) {
            window.location.href = redirectUrl;
        } else {
            // === UPDATED REDIRECT LOGIC ===
            if (user.role === 'ADMIN') {
                window.location.href = '/admin-dashboard.html';
            } else if (user.role === 'AGENT') {
                window.location.href = '/agent-dashboard.html'; // Redirect Agents here
            } else {
                window.location.href = '/user-dashboard.html';
            }
        }
    } catch (error) {
        console.error('Login failed', error);
        alert('Login failed: ' + (error.response?.data?.message || error.message));
    }
};

export const register = async (userData) => {
    try {
        const response = await api.post('/auth/register', userData);
        localStorage.setItem('token', response.data.token);
        window.location.href = '/';
    } catch (error) {
        console.error('Registration failed', error);
        alert('Registration failed: ' + (error.response?.data?.message || error.message));
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
};

// Validates current session
export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

// ============================================
// SAVED PROPERTIES MANAGEMENT
// ============================================

export const getSavedProperties = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return [];
    const saved = localStorage.getItem(`saved_properties_${user.email}`);
    return saved ? JSON.parse(saved) : [];
};

export const toggleSavedProperty = (propertyId) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        alert('Please login to save properties');
        window.location.href = '/login.html';
        return false;
    }

    const saved = getSavedProperties();
    const stringId = String(propertyId);
    const index = saved.findIndex(id => String(id) === stringId);

    if (index === -1) {
        saved.push(stringId);
        localStorage.setItem(`saved_properties_${user.email}`, JSON.stringify(saved));
        return true; // Saved
    } else {
        saved.splice(index, 1);
        localStorage.setItem(`saved_properties_${user.email}`, JSON.stringify(saved));
        return false; // Removed
    }
};

export const isPropertySaved = (propertyId) => {
    const saved = getSavedProperties();
    return saved.some(id => String(id) === String(propertyId));
};

// Expose to window for inline handlers
window.getSavedProperties = getSavedProperties;
window.toggleSavedProperty = toggleSavedProperty;
window.isPropertySaved = isPropertySaved;

// ============================================
// NAVBAR INJECTION
// ============================================

export const setupNavbar = () => {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    const isAuth = isAuthenticated();
    const currentPath = window.location.pathname;

    // Determine active page
    const getActiveClass = (path) => {
        if (path === '/' && (currentPath === '/' || currentPath === '/index.html')) return 'active';
        if (path === '/properties' && currentPath.includes('properties')) return 'active';
        if (path === '/sell-property' && currentPath.includes('sell-property')) return 'active';
        if (path === '/agents' && currentPath.includes('agents')) return 'active';
        if (path === '/about' && currentPath.includes('about')) return 'active';
        if (path === '/contact' && currentPath.includes('contact')) return 'active';
        if (path === '/user-dashboard.html' && currentPath.includes('user-dashboard')) return 'active';
        return '';
    };

    // Build user dropdown HTML
    let userDropdownHTML = '';
    if (isAuth) {
        const user = JSON.parse(localStorage.getItem('user'));
        const userName = user?.name || 'User';
        const userEmail = user?.email || '';
        const userInitial = userName.charAt(0).toUpperCase();

        userDropdownHTML = `
            <div class="relative group">
                <button id="userMenuBtn" class="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full pl-2 pr-4 py-1.5 transition-all outline-none focus:ring-2 focus:ring-primary/50">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-black font-bold text-sm">
                        ${userInitial}
                    </div>
                    <div class="text-left hidden md:block">
                        <div class="text-xs text-gray-400">Welcome back</div>
                        <div class="text-sm font-medium text-white leading-none">${userName.split(' ')[0]}</div>
                    </div>
                    <svg class="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                
                <!-- Dropdown Menu -->
                <div class="absolute right-0 mt-2 w-64 bg-[#111] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                    <div class="p-4 border-b border-white/5">
                        <p class="text-white font-medium">${userName}</p>
                        <p class="text-xs text-gray-500 truncate">${userEmail}</p>
                    </div>
                    <div class="p-2">
                        <a href="/user-dashboard.html" class="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            Edit Profile
                        </a>
                        <button id="logoutBtn" class="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        userDropdownHTML = `
            <a href="/login.html" class="nav-btn-ghost">Login</a>
            <a href="/register.html" class="nav-btn-primary">
                Sign up
            </a>
        `;
    }

    navbar.innerHTML = `
        <nav id="mainNav" class="fluid-glass-nav">
            <div class="fluid-glass-inner">
                <div class="flex justify-between items-center">
                    <!-- Logo -->
                    <a href="/" class="nav-logo">
                        RealEstate
                    </a>
                    
                    <!-- Navigation Pills -->
                    <div class="nav-pills-container">
                        <a href="/" class="nav-pill ${getActiveClass('/')}">Home</a>
                        <a href="/properties.html" class="nav-pill ${getActiveClass('/properties')}">Properties</a>
                        <a href="/sell-property.html" class="nav-pill ${getActiveClass('/sell-property')}">Sell Property</a>
                        <a href="/agents.html" class="nav-pill ${getActiveClass('/agents')}">Agents</a>
                        <a href="/about.html" class="nav-pill ${getActiveClass('/about')}">About Us</a>
                        <a href="#contact" class="nav-pill ${getActiveClass('/contact')}">Contact</a>
                        ${isAuth ? `<a href="/user-dashboard.html" class="nav-pill ${getActiveClass('/user-dashboard.html')}">Dashboard</a>` : ''}
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="nav-actions">
                        ${userDropdownHTML}
                        
                        <!-- Mobile Menu Button -->
                        <button id="mobileMenuBtn" class="nav-mobile-btn md:hidden">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
        
        <!-- Navbar Spacer to prevent content overlap -->
        <div class="navbar-spacer"></div>
    `;

    // Scroll Effect - Enhanced Glass on Scroll
    const mainNav = document.getElementById('mainNav');
    if (mainNav) {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                mainNav.classList.add('scrolled');
            } else {
                mainNav.classList.remove('scrolled');
            }
        };

        window.addEventListener('scroll', handleScroll);
        // Initial check
        handleScroll();
    }

    // Logout handler
    if (isAuth) {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    }

    // Mobile menu handler (basic toggle)
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            const pills = document.querySelector('.nav-pills-container');
            if (pills) {
                pills.style.display = pills.style.display === 'flex' ? 'none' : 'flex';
                pills.style.position = 'absolute';
                pills.style.top = '100%';
                pills.style.left = '0';
                pills.style.right = '0';
                pills.style.marginTop = '10px';
                pills.style.flexDirection = 'column';
                pills.style.background = 'rgba(13, 13, 13, 0.95)';
                pills.style.padding = '16px';
                pills.style.borderRadius = '16px';
                pills.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            }
        });
    }
};

// ============================================
// API EXPORTS
// ============================================

export const propertyApi = {
    getAll: () => api.get('/properties'),
    getById: (id) => api.get(`/properties/${id}`),
    search: (query) => api.get(`/properties/search?q=${query}`),
    getByType: (type) => api.get(`/properties/type/${type}`)
};

// ============================================
// FOOTER INJECTION
// ============================================

export const setupFooter = () => {
    let footer = document.getElementById('footer');
    if (!footer) {
        // Create footer if it doesn't exist in HTML
        footer = document.createElement('footer');
        footer.id = 'footer';
        document.body.appendChild(footer);
    }

    footer.innerHTML = `
        <div class="bg-surface border-t border-dark-border text-white pt-16 pb-8 mt-auto">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div class="space-y-4">
                        <div class="text-2xl font-bold text-primary">
                            RealEstate
                        </div>
                        <p class="text-gray-400 text-sm leading-relaxed">
                            Transforming the way you find your dream home. Premium properties, trusted agents, and seamless experiences.
                        </p>
                    </div>
                    
                    <div>
                        <h3 class="text-lg font-semibold mb-4 text-white">Quick Links</h3>
                        <ul class="space-y-2 text-gray-400">
                            <li><a href="/" class="hover:text-primary transition-colors">Home</a></li>
                            <li><a href="/properties.html" class="hover:text-primary transition-colors">Properties</a></li>
                            <li><a href="/login.html" class="hover:text-primary transition-colors">Login</a></li>
                            <li><a href="/register.html" class="hover:text-primary transition-colors">Register</a></li>
                        </ul>
                    </div>

                    <div>
                        <h3 class="text-lg font-semibold mb-4 text-white">Contact</h3>
                        <ul class="space-y-2 text-gray-400 text-sm">
                            <li class="flex items-center"><span class="mr-2">📍</span> 123 Innovation Dr, Tech City</li>
                            <li class="flex items-center"><span class="mr-2">📧</span> support@realestate.com</li>
                            <li class="flex items-center"><span class="mr-2">📞</span> +1 (555) 123-4567</li>
                        </ul>
                    </div>

                    <div>
                        <h3 class="text-lg font-semibold mb-4 text-white">Follow Us</h3>
                        <div class="flex space-x-4">
                            <a href="#" class="w-10 h-10 rounded-full bg-dark-card border border-dark-border flex items-center justify-center hover:border-primary hover:text-primary transition-all duration-300">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                            </a>
                            <a href="#" class="w-10 h-10 rounded-full bg-dark-card border border-dark-border flex items-center justify-center hover:border-primary hover:text-primary transition-all duration-300">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                            </a>
                            <a href="#" class="w-10 h-10 rounded-full bg-dark-card border border-dark-border flex items-center justify-center hover:border-primary hover:text-primary transition-all duration-300">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069-3.204 0-3.584-.012-4.849-.069-3.225-.149-4.771-1.664-4.919-4.919-.058-1.265-.069-1.644-.069-4.849 0-3.204.012-3.584.069-4.849.149-3.225 1.664-4.771 4.919-4.919 1.265-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                            </a>
                        </div>
                    </div>
                </div>
                <div class="border-t border-dark-border pt-8 text-center text-gray-500 text-sm">
                    &copy; ${new Date().getFullYear()} Real Estate Inc. All rights reserved.
                </div>
            </div>
    `;
};

// ============================================
// HERO SCROLL & REVEAL ANIMATIONS
// ============================================

const setupHeroScrollEffect = () => {
    const hero = document.getElementById('hero');
    const heroBg = document.getElementById('heroBg');
    const heroContent = document.getElementById('heroContent');

    if (!hero || !heroBg || !heroContent) return;

    const handleScroll = () => {
        const rect = hero.getBoundingClientRect();

        // Only calculate if hero is roughly in view
        if (rect.bottom > 0) {
            const scrolled = Math.max(0, -rect.top);
            const t = Math.min(1, scrolled / hero.offsetHeight); // 0 -> 1

            requestAnimationFrame(() => {
                // Parallax background (subtle translateY + initial scale)
                heroBg.style.transform = `scale(1.08) translateY(${t * 40}px)`;

                // Soft blur + darken (max blur: 8px, max dim: 40%)
                heroBg.style.filter = `blur(${t * 8}px) brightness(${1 - t * 0.4})`;

                // Title fades/moves up
                heroContent.style.transform = `translateY(${t * -50}px)`;
                heroContent.style.opacity = `${1 - t * 1.3}`;
            });
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial call to set state
    handleScroll();
};

const setupScrollReveal = () => {
    // Bidirectional Intersection Observer - elements show/hide based on viewport
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.12
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Toggle show class based on intersection state (bidirectional)
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            } else {
                entry.target.classList.remove('show');
            }
        });
    }, observerOptions);

    // Select elements to reveal
    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => observer.observe(el));
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;

    // Skip navbar/footer injection on dashboard pages (they have their own layout)
    const isDashboardPage = currentPath.includes('user-dashboard') || currentPath.includes('admin-dashboard') || currentPath.includes('agent-dashboard');

    if (!isDashboardPage) {
        setupNavbar();
        setupFooter();
    }

    setupHeroScrollEffect();
    setupScrollReveal();
});
