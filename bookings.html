<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Bookings | Venue Manager Pro</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        /* --- CORE STYLES (Matches Dashboard) --- */
        :root {
            --bg-dark: #0f172a;
            --bg-card: rgba(30, 41, 59, 0.7);
            --border: rgba(148, 163, 184, 0.1);
            --primary: #6366f1;
            --success: #10b981;
            --warning: #f59e0b;
            --info: #0ea5e9;
            --danger: #ef4444;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --sidebar-width: 260px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }

        body {
            background-color: var(--bg-dark);
            background-image: radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), 
                              radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            overflow-x: hidden;
        }

        /* --- SIDEBAR --- */
        aside {
            width: var(--sidebar-width);
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(10px);
            border-right: 1px solid var(--border);
            padding: 2rem;
            display: flex; flex-direction: column; position: fixed; height: 100vh; z-index: 100;
            transition: transform 0.3s ease;
        }
        .brand { font-size: 1.5rem; font-weight: 700; color: white; display: flex; align-items: center; gap: 10px; margin-bottom: 3rem; }
        .nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 16px; color: var(--text-muted); text-decoration: none; border-radius: 8px; margin-bottom: 5px; transition: all 0.2s; font-weight: 500; }
        .nav-link:hover, .nav-link.active { background: rgba(99, 102, 241, 0.1); color: var(--primary); }
        .close-sidebar { display: none; background: none; border: none; color: white; font-size: 1.2rem; margin-left: auto; cursor: pointer; }

        /* --- MAIN CONTENT --- */
        main {
            margin-left: var(--sidebar-width);
            flex: 1;
            padding: 2rem;
            max-width: 1600px;
            width: 100%;
            transition: margin-left 0.3s ease;
        }

        /* --- HEADER & CONTROLS --- */
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .menu-toggle { display: none; background: var(--bg-card); border: 1px solid var(--border); color: white; width: 40px; height: 40px; border-radius: 8px; align-items: center; justify-content: center; cursor: pointer; margin-right: 15px; }
        
        /* --- METRICS DIALS (Cards) --- */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
            margin-bottom: 2.5rem;
        }

        .metric-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1.5rem;
            position: relative;
            overflow: hidden;
        }

        /* The Dial Circle */
        .dial-ring {
            width: 70px; height: 70px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; font-weight: 700;
            position: relative;
            background: rgba(15, 23, 42, 0.5);
        }
        
        /* CSS Conic Gradient for "Dial" effect */
        .dial-ring::before {
            content: ''; position: absolute; inset: -3px; border-radius: 50%; z-index: -1;
            background: conic-gradient(var(--card-color) var(--pct), rgba(255,255,255,0.1) 0);
        }

        .metric-info h3 { font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px; }
        .metric-info p { font-size: 0.85rem; opacity: 0.8; }

        /* Color Variants */
        .card-pre { --card-color: var(--warning); }
        .card-booked { --card-color: var(--primary); }
        .card-post { --card-color: var(--success); }

        /* --- FILTERS --- */
        .filter-bar {
            display: flex; gap: 10px; margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 5px;
        }
        
        .filter-btn {
            background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted);
            padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.9rem; font-weight: 600;
            transition: all 0.2s; white-space: nowrap;
        }
        .filter-btn:hover, .filter-btn.active { background: var(--primary); color: white; border-color: var(--primary); }

        /* --- BOOKING LIST --- */
        .booking-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.25rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: transform 0.2s;
        }
        .booking-card:hover { transform: translateX(5px); }

        .b-left { display: flex; align-items: center; gap: 1.5rem; }
        
        .date-badge {
            background: rgba(255,255,255,0.05);
            padding: 8px 15px; border-radius: 10px;
            text-align: center; min-width: 70px;
            border: 1px solid var(--border);
        }
        .db-day { font-size: 1.2rem; font-weight: 700; color: white; }
        .db-month { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); }

        .b-details h4 { font-size: 1.1rem; color: white; margin-bottom: 4px; }
        .b-meta { font-size: 0.9rem; color: var(--text-muted); display: flex; gap: 15px; flex-wrap: wrap; }
        .b-meta i { margin-right: 5px; color: var(--primary); }

        .status-pill {
            padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
            white-space: nowrap;
        }
        .status-pre { background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid var(--warning); }
        .status-booked { background: rgba(99, 102, 241, 0.15); color: var(--primary); border: 1px solid var(--primary); }
        .status-completed { background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid var(--success); }

        /* --- RESPONSIVE --- */
        @media (max-width: 1024px) {
            .metrics-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
            aside { transform: translateX(-100%); }
            aside.active { transform: translateX(0); }
            main { margin-left: 0; padding: 1rem; }
            .menu-toggle { display: flex; }
            .close-sidebar { display: block; }
            .booking-card { flex-direction: column; align-items: flex-start; gap: 1rem; }
            .b-left { width: 100%; }
            .status-pill { align-self: flex-start; margin-left: 85px; } /* Align with text */
        }
        
        .overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 90; backdrop-filter: blur(2px); }
        .overlay.active { display: block; }
    </style>
</head>
<body>

    <div class="overlay" id="overlay" onclick="toggleMenu()"></div>

    <!-- Sidebar -->
    <aside id="sidebar">
        <div class="brand">
            <span><i class="fa-solid fa-layer-group"></i> VenuePro</span>
            <button class="close-sidebar" onclick="toggleMenu()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <nav>
            <a href="dashboard.html" class="nav-link"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>
            <a href="bookings.html" class="nav-link active"><i class="fa-solid fa-calendar-days"></i> Bookings</a>
            <a href="customers.html" class="nav-link"><i class="fa-solid fa-users"></i> Customers</a>
            <a href="accounts.html" class="nav-link"><i class="fa-solid fa-file-invoice-dollar"></i> Accounts</a>
        </nav>
    </aside>

    <!-- Main Content -->
    <main>
        <header>
            <div style="display: flex; align-items: center;">
                <div class="menu-toggle" onclick="toggleMenu()"><i class="fa-solid fa-bars"></i></div>
                <h1 style="font-size: 1.8rem; font-weight: 700;">Booking Management</h1>
            </div>
        </header>

        <!-- Dials / Metrics -->
        <div class="metrics-grid">
            <!-- 1. Pre-Booked -->
            <div class="metric-card card-pre">
                <div class="dial-ring" id="dial-pre" style="--pct: 0%;">0</div>
                <div class="metric-info">
                    <h3>Pre-Booked</h3>
                    <p>Deposit paid, awaiting balance</p>
                </div>
            </div>

            <!-- 2. Booked (Confirmed) -->
            <div class="metric-card card-booked">
                <div class="dial-ring" id="dial-booked" style="--pct: 0%;">0</div>
                <div class="metric-info">
                    <h3>Confirmed</h3>
                    <p>Fully paid, ready for event</p>
                </div>
            </div>

            <!-- 3. Post-Booked (Completed) -->
            <div class="metric-card card-post">
                <div class="dial-ring" id="dial-post" style="--pct: 0%;">0</div>
                <div class="metric-info">
                    <h3>Completed</h3>
                    <p>Past events (History)</p>
                </div>
            </div>
        </div>

        <!-- Filters -->
        <div class="filter-bar">
            <button class="filter-btn active" onclick="filterList('all')">All Bookings</button>
            <button class="filter-btn" onclick="filterList('pre')">Pre-Booked</button>
            <button class="filter-btn" onclick="filterList('booked')">Confirmed</button>
            <button class="filter-btn" onclick="filterList('post')">Completed</button>
        </div>

        <!-- List -->
        <div id="booking-container">
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <i class="fa-solid fa-circle-notch fa-spin"></i> Loading data...
            </div>
        </div>

    </main>

    <script>
        // === CONFIGURATION ===
        const API_URL = 'https://n8n.srv1090894.hstgr.cloud/webhook/all-bookings';
        
        let allBookings = []; // Store data locally for filtering

        // === UTILS ===
        function toggleMenu() {
            document.getElementById('sidebar').classList.toggle('active');
            document.getElementById('overlay').classList.toggle('active');
        }

        const formatCurrency = (num) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(num);

        // === LOGIC ===
        async function fetchBookings() {
            try {
                const res = await fetch(API_URL);
                if(!res.ok) throw new Error("API Error");
                const rawData = await res.json();

                // Categorize Data
                const now = new Date();
                now.setHours(0,0,0,0); // Normalize today

                allBookings = rawData.map(b => {
                    const bDate = new Date(b.booking_date);
                    let category = 'pre'; // Default

                    // Logic:
                    // 1. If date is in past -> Completed
                    // 2. If date is future AND fully paid (balance <= 0) -> Confirmed
                    // 3. Else -> Pre-Booked (Pending balance)
                    
                    if (bDate < now) {
                        category = 'post';
                    } else if (b.balance_due <= 0) {
                        category = 'booked';
                    } else {
                        category = 'pre';
                    }

                    return { ...b, category, dateObj: bDate };
                });

                updateMetrics();
                filterList('all'); // Initial render

            } catch (e) {
                console.error(e);
                document.getElementById('booking-container').innerHTML = 
                    `<div style="text-align:center; padding:2rem; color:#ef4444">Failed to load bookings. Check console.</div>`;
            }
        }

        function updateMetrics() {
            // Count totals
            const counts = {
                pre: allBookings.filter(b => b.category === 'pre').length,
                booked: allBookings.filter(b => b.category === 'booked').length,
                post: allBookings.filter(b => b.category === 'post').length
            };
            const total = allBookings.length || 1; // Avoid divide by zero

            // Update DOM Numbers
            document.getElementById('dial-pre').innerText = counts.pre;
            document.getElementById('dial-booked').innerText = counts.booked;
            document.getElementById('dial-post').innerText = counts.post;

            // Update Dial CSS Variables (for the gradient border effect)
            // Example: If 50% are pre-booked, the dial border is 50% colored
            document.getElementById('dial-pre').style.setProperty('--pct', `${(counts.pre/total)*100}%`);
            document.getElementById('dial-booked').style.setProperty('--pct', `${(counts.booked/total)*100}%`);
            document.getElementById('dial-post').style.setProperty('--pct', `${(counts.post/total)*100}%`);
        }

        function filterList(filterType) {
            // Update buttons
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            // Filter data
            const filtered = filterType === 'all' 
                ? allBookings 
                : allBookings.filter(b => b.category === filterType);

            // Sort: Upcoming first for active, Newest first for history
            filtered.sort((a, b) => filterType === 'post' ? b.dateObj - a.dateObj : a.dateObj - b.dateObj);

            // Render
            const container = document.getElementById('booking-container');
            if (filtered.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted)">No bookings found in this category.</div>`;
                return;
            }

            container.innerHTML = filtered.map(b => {
                // Styling configs based on category
                let statusText = '';
                let statusClass = '';
                
                if(b.category === 'pre') { statusText = 'Pending Balance'; statusClass = 'status-pre'; }
                else if(b.category === 'booked') { statusText = 'Confirmed'; statusClass = 'status-booked'; }
                else { statusText = 'Completed'; statusClass = 'status-completed'; }

                return `
                <div class="booking-card" style="border-left: 4px solid var(--${getBorderColor(b.category)})">
                    <div class="b-left">
                        <div class="date-badge">
                            <div class="db-day">${b.dateObj.getDate()}</div>
                            <div class="db-month">${b.dateObj.toLocaleString('default', { month: 'short' })}</div>
                        </div>
                        <div class="b-details">
                            <h4>${b.customer_name || 'Guest'}</h4>
                            <div class="b-meta">
                                <span><i class="fa-solid fa-layer-group"></i> ${b.room_name}</span>
                                <span><i class="fa-solid fa-clock"></i> ${b.start_time?.slice(0,5)} - ${b.end_time?.slice(0,5)}</span>
                                <span><i class="fa-solid fa-sterling-sign"></i> Total: ${formatCurrency(b.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="status-pill ${statusClass}">
                        ${statusText}
                    </div>
                </div>
                `;
            }).join('');
        }

        function getBorderColor(cat) {
            if(cat === 'pre') return 'warning';
            if(cat === 'booked') return 'primary';
            return 'success';
        }

        // Init
        fetchBookings();

    </script>
</body>
</html>
