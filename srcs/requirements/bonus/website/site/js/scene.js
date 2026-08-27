import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// --- DATA DEFINITIONS ---

const containersData = [
    { id: 'nginx', name: 'nginx', color: 0x3b82f6, pos: [0, 2, 6], size: [2.5, 1.5, 2] },
    { id: 'wordpress', name: 'wordpress', color: 0x22c55e, pos: [0, 2, 0], size: [2.5, 1.5, 2] },
    { id: 'mariadb', name: 'mariadb', color: 0xf97316, pos: [0, 2, -6], size: [2.5, 1.5, 2] },
    { id: 'redis', name: 'redis', color: 0xef4444, pos: [5, 2, -2], size: [1.8, 1.2, 1.5] },
    { id: 'adminer', name: 'adminer', color: 0xa855f7, pos: [-5, 2, -4], size: [1.8, 1.2, 1.5] },
    { id: 'ftp', name: 'ftp', color: 0xeab308, pos: [-5, 2, 2], size: [1.8, 1.2, 1.5] },
    { id: 'dns', name: 'dns', color: 0x06b6d4, pos: [7, 2, 6], size: [1.8, 1.2, 1.5] }
];

const browserData = { id: 'browser', name: 'Browser', color: 0xffffff, pos: [0, 2, 12], size: [3, 2, 0.2] };

const connectionsData = [
    { from: 'browser', to: 'nginx', label: ':443 TLS', color: 0x3b82f6, dashed: false },
    { from: 'nginx', to: 'wordpress', label: ':9000 FastCGI', color: 0x22c55e, dashed: false },
    { from: 'nginx', to: 'adminer', label: ':8080 FastCGI', color: 0xa855f7, dashed: false },
    { from: 'wordpress', to: 'mariadb', label: ':3306 MySQL', color: 0xf97316, dashed: false },
    { from: 'wordpress', to: 'redis', label: ':6379 Redis', color: 0xef4444, dashed: false },
    { from: 'adminer', to: 'mariadb', label: ':3306 MySQL', color: 0xf97316, dashed: false },
    { from: 'ftp', to: 'wordpress', label: ':21 FTP', color: 0xeab308, dashed: false },
    { from: 'dns', to: 'external', label: ':53 DNS', color: 0x06b6d4, dashed: true },
    { from: 'browser', to: 'dns', label: 'DNS Query', color: 0x06b6d4, dashed: true }
];

const volumesData = [
    { id: 'wordpress_data', name: 'wordpress_data', color: 0x22c55e, pos: [0, -0.5, 2], connectsTo: ['nginx', 'wordpress', 'ftp'] },
    { id: 'mariadb_data', name: 'mariadb_data', color: 0xf97316, pos: [0, -0.5, -6], connectsTo: ['mariadb'] }
];

const infoData = {
    'nginx': {
        title: "NGINX - Reverse Proxy & SSL Termination",
        body: `
<div class='info-section'><h4>Purpose</h4><p>NGINX serves as the entry point, handling TLS termination and reverse proxying requests to WordPress and Adminer via FastCGI.</p></div>
<div class='info-section'><h4>Image</h4><p>debian:bookworm-slim + nginx + openssl</p></div>
<div class='info-section'><h4>Port</h4><p><span class='port-badge'>443</span> (HTTPS/TLS)</p></div>
<div class='info-section'><h4>TLS</h4><p>Self-signed RSA 4096-bit certificate, TLSv1.2 & TLSv1.3</p></div>
<div class='info-section'><h4>Volumes</h4><p>wordpress_data → /var/www/html (serves static files)</p></div>
<div class='info-section'><h4>Network</h4><p>inception-net (bridge)</p></div>
<div class='info-section'><h4>Key Config</h4><pre><code>location ~ \\.php$ {
    fastcgi_pass wordpress:9000;
}
location /adminer {
    fastcgi_pass adminer:8080;
}</code></pre></div>
<div class='info-section'><h4>Dependencies</h4><p>Depends on: wordpress, adminer, dns</p></div>
<div class='info-section impact'><h4>If Removed</h4><p>No HTTPS access. No TLS. WordPress and Adminer become unreachable from outside the Docker network.</p></div>
`
    },
    'wordpress': {
        title: "WordPress - PHP-FPM Application Server",
        body: `
<div class='info-section'><h4>Purpose</h4><p>Runs WordPress on PHP-FPM 8.2, the core web application. Handles dynamic content generation, communicates with MariaDB for data and Redis for caching.</p></div>
<div class='info-section'><h4>Image</h4><p>debian:bookworm-slim + PHP 8.2 FPM + extensions + WP-CLI</p></div>
<div class='info-section'><h4>Port</h4><p><span class='port-badge'>9000</span> (FastCGI, internal only)</p></div>
<div class='info-section'><h4>Volumes</h4><p>wordpress_data → /var/www/html</p></div>
<div class='info-section'><h4>Network</h4><p>inception-net (bridge)</p></div>
<div class='info-section'><h4>Startup Process</h4><ol><li>Source secrets from /run/secrets/wp_credentials</li><li>Download WordPress if not present</li><li>Wait for MariaDB to be ready (30 attempts)</li><li>Create wp-config.php via WP-CLI</li><li>Install WordPress core</li><li>Create second user (author role)</li><li>Configure Redis cache plugin</li><li>Start php-fpm8.2 -F</li></ol></div>
<div class='info-section'><h4>Dependencies</h4><p>Depends on: mariadb, redis</p></div>
<div class='info-section impact'><h4>If Removed</h4><p>No web application. NGINX would have nothing to proxy to. The entire site would return 502 errors.</p></div>
`
    },
    'mariadb': {
        title: "MariaDB - Database Server",
        body: `
<div class='info-section'><h4>Purpose</h4><p>Stores all WordPress data: posts, pages, users, settings, plugin data. The persistent data backbone of the application.</p></div>
<div class='info-section'><h4>Image</h4><p>debian:bookworm-slim + mariadb-server + mariadb-client</p></div>
<div class='info-section'><h4>Port</h4><p><span class='port-badge'>3306</span> (MySQL protocol, internal only)</p></div>
<div class='info-section'><h4>Volumes</h4><p>mariadb_data → /var/lib/mysql</p></div>
<div class='info-section'><h4>Network</h4><p>inception-net (bridge)</p></div>
<div class='info-section'><h4>Startup Process</h4><ol><li>Read root password from /run/secrets/db_root_passwd</li><li>Read user password from /run/secrets/db_passwd</li><li>If first boot: run mariadb-install-db</li><li>Start temporary server</li><li>Set root password, create database, create user, grant privileges</li><li>Shutdown temporary server</li><li>Exec mariadbd --user=mysql --bind-address=0.0.0.0</li></ol></div>
<div class='info-section'><h4>Secrets</h4><p>db_passwd, db_root_passwd</p></div>
<div class='info-section impact'><h4>If Removed</h4><p>WordPress cannot store or retrieve any data. The site would fail to load entirely. All content would be lost without volume persistence.</p></div>
`
    },
    'redis': {
        title: "Redis - Object Cache Server",
        body: `
<div class='info-section'><h4>Purpose</h4><p>Provides in-memory caching for WordPress. Stores frequently accessed data (pages, queries) to reduce MariaDB load and speed up responses.</p></div>
<div class='info-section'><h4>Image</h4><p>debian:bookworm-slim + redis-server (official repo)</p></div>
<div class='info-section'><h4>Port</h4><p><span class='port-badge'>6379</span> (Redis protocol, internal only)</p></div>
<div class='info-section'><h4>Network</h4><p>inception-net (bridge)</p></div>
<div class='info-section'><h4>Configuration</h4><pre><code>bind 0.0.0.0
protected-mode no</code></pre></div>
<div class='info-section'><h4>WordPress Integration</h4><p>WordPress uses the redis-cache plugin. WP_REDIS_HOST=redis, WP_REDIS_PORT=6379. Object cache stored in /wp-content/object-cache.php.</p></div>
<div class='info-section impact'><h4>If Removed</h4><p>WordPress still works but slower. Every page load hits MariaDB directly. No caching layer. Higher database load.</p></div>
`
    },
    'adminer': {
        title: "Adminer - Database Management UI",
        body: `
<div class='info-section'><h4>Purpose</h4><p>Lightweight web-based database management tool. Allows visual inspection and management of the MariaDB database via a browser UI.</p></div>
<div class='info-section'><h4>Image</h4><p>debian:bookworm-slim + php-fpm + adminer.php v4.8.1</p></div>
<div class='info-section'><h4>Port</h4><p><span class='port-badge'>8080</span> (FastCGI, internal only)</p></div>
<div class='info-section'><h4>Network</h4><p>inception-net (bridge)</p></div>
<div class='info-section'><h4>Access</h4><p>Available at https://oobbad.42.fr/adminer through NGINX reverse proxy</p></div>
<div class='info-section'><h4>Dependencies</h4><p>Depends on: mariadb</p></div>
<div class='info-section impact'><h4>If Removed</h4><p>No visual database management. Must use command-line mysql client instead. No impact on WordPress functionality.</p></div>
`
    },
    'ftp': {
        title: "FTP - File Transfer Server",
        body: `
<div class='info-section'><h4>Purpose</h4><p>Provides FTP access to the WordPress file system. Allows uploading themes, plugins, and media files directly to /var/www/html.</p></div>
<div class='info-section'><h4>Image</h4><p>debian:bookworm-slim + vsftpd</p></div>
<div class='info-section'><h4>Ports</h4><p><span class='port-badge'>21</span> (FTP control) + <span class='port-badge'>6000-6010</span> (passive mode data)</p></div>
<div class='info-section'><h4>Volumes</h4><p>wordpress_data → /var/www/html</p></div>
<div class='info-section'><h4>Network</h4><p>inception-net (bridge)</p></div>
<div class='info-section'><h4>Startup Process</h4><ol><li>Read FTP credentials from /run/secrets/ftp_credentials</li><li>Create FTP user if not exists</li><li>Wait for WordPress to be installed (wp-config.php)</li><li>Set file permissions (www-data group)</li><li>Configure vsftpd (write_enable, chroot, passive mode)</li><li>Start vsftpd</li></ol></div>
<div class='info-section'><h4>Dependencies</h4><p>Depends on: wordpress</p></div>
<div class='info-section impact'><h4>If Removed</h4><p>No FTP file upload capability. Must manage WordPress files through the web UI or docker exec. No impact on site operation.</p></div>
`
    },
    'dns': {
        title: "DNS - Local Domain Resolver",
        body: `
<div class='info-section'><h4>Purpose</h4><p>Runs dnsmasq to resolve oobbad.42.fr to 127.0.0.1 (localhost). Enables the .42.fr domain to work locally without modifying /etc/hosts.</p></div>
<div class='info-section'><h4>Image</h4><p>debian:bookworm-slim + dnsmasq</p></div>
<div class='info-section'><h4>Port</h4><p><span class='port-badge'>53</span> (DNS, UDP+TCP) — bound to 127.0.0.1 only</p></div>
<div class='info-section'><h4>Network</h4><p><strong>Isolated</strong> — not on inception-net. Binds port 53 to localhost on the host.</p></div>
<div class='info-section'><h4>Configuration</h4><pre><code>listen-address=0.0.0.0
bind-interfaces
address=/oobbad.42.fr/127.0.0.1
server=8.8.8.8
server=1.1.1.1</code></pre></div>
<div class='info-section'><h4>How it works</h4><p>The Makefile locks /etc/resolv.conf to point to this container. All DNS queries go through dnsmasq. Queries for oobbad.42.fr resolve locally; all other queries are forwarded to Google (8.8.8.8) and Cloudflare (1.1.1.1).</p></div>
<div class='info-section impact'><h4>If Removed</h4><p>oobbad.42.fr won't resolve. Must manually add entries to /etc/hosts. The Makefile DNS locking would break.</p></div>
`
    }
};

const flowPath = [
    { from: 'browser', to: 'dns', label: 'DNS Query', duration: 0.8 },
    { from: 'browser', to: 'nginx', label: 'HTTPS :443', duration: 0.8 },
    { from: 'nginx', to: 'wordpress', label: 'FastCGI :9000', duration: 0.8 },
    { from: 'wordpress', to: 'redis', label: 'Cache Check', duration: 0.6 },
    { from: 'redis', to: 'wordpress', label: 'Cache Miss', duration: 0.6 },
    { from: 'wordpress', to: 'mariadb', label: 'SQL Query', duration: 0.8 },
    { from: 'mariadb', to: 'wordpress', label: 'Data', duration: 0.8 },
    { from: 'wordpress', to: 'nginx', label: 'Response', duration: 0.8 },
    { from: 'nginx', to: 'browser', label: 'HTML', duration: 0.8 }
];


// --- STATE & GLOBALS ---

let scene, camera, renderer, labelRenderer, controls;
let containerMeshes = {};
let connectionLines = [];
let raycaster, mouse;
let hoveredContainer = null;
let selectedContainer = null;
let lastInteractionTime = Date.now();
let time = 0;

// Camera animation
let isAnimatingCamera = false;
let targetCameraPos = new THREE.Vector3();
let targetCameraLookAt = new THREE.Vector3();
const defaultCameraPos = new THREE.Vector3(15, 12, 18);
const defaultCameraLookAt = new THREE.Vector3(0, 1, 0);

// Flow animation
let flowActive = false;
let flowParticle = null;
let flowParticleLight = null;
let flowLabel = null;
let currentFlowStep = 0;
let flowStartTime = 0;


// --- INITIALIZATION ---

function init() {
    const container = document.getElementById('three-container');
    if (!container) return;

    // Scene setup
    scene = new THREE.Scene();
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.copy(defaultCameraPos);
    
    // WebGL Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // CSS2D Renderer setup
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none'; // allow click through
    container.appendChild(labelRenderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 50);
    pointLight.position.set(10, 20, 10);
    scene.add(pointLight);
    
    const pointLight2 = new THREE.PointLight(0xffffff, 0.8, 50);
    pointLight2.position.set(-10, -10, -10);
    scene.add(pointLight2);

    // Grid / Network Plane
    const gridHelper = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
    gridHelper.position.y = 0;
    if (Array.isArray(gridHelper.material)) {
        gridHelper.material.forEach(m => { m.transparent = true; m.opacity = 0.2; });
    } else {
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.2;
    }
    scene.add(gridHelper);

    const netPlaneGeo = new THREE.PlaneGeometry(22, 18);
    const netPlaneMat = new THREE.MeshBasicMaterial({ 
        color: 0x1e293b, 
        transparent: true, 
        opacity: 0.3, 
        side: THREE.DoubleSide 
    });
    const netPlane = new THREE.Mesh(netPlaneGeo, netPlaneMat);
    netPlane.rotation.x = -Math.PI / 2;
    netPlane.position.set(0, 0.01, 0); // slightly above grid
    scene.add(netPlane);
    
    const netLabelDiv = document.createElement('div');
    netLabelDiv.className = 'network-label';
    netLabelDiv.textContent = 'inception-net (bridge)';
    netLabelDiv.style.color = '#94a3b8';
    netLabelDiv.style.fontSize = '12px';
    const netLabel = new CSS2DObject(netLabelDiv);
    netLabel.position.set(-8, 0, 8);
    scene.add(netLabel);

    // Stars background
    createStars();

    // Build Scene Objects
    buildContainers();
    buildVolumes();
    buildConnections();

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.2;
    controls.target.copy(defaultCameraLookAt);

    // Raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Event Listeners
    window.addEventListener('resize', resize);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onClick);
    container.addEventListener('touchstart', onTouchStart, { passive: false });

    // Start loop
    animate();
}

function createStars() {
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 500;
    const posArray = new Float32Array(starsCount * 3);
    for(let i=0; i < starsCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 100;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starsMat = new THREE.PointsMaterial({ size: 0.1, color: 0xffffff, transparent: true, opacity: 0.5 });
    const starsMesh = new THREE.Points(starsGeo, starsMat);
    scene.add(starsMesh);
}

function buildContainers() {
    const allEntities = [...containersData, browserData];

    allEntities.forEach(data => {
        const group = new THREE.Group();
        group.position.set(...data.pos);
        group.userData = { id: data.id, isContainer: true, name: data.name, baseScale: 1.0, color: data.color };

        // Box
        const geometry = new THREE.BoxGeometry(...data.size);
        const material = new THREE.MeshStandardMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.85,
            roughness: 0.2,
            metalness: 0.1,
            emissive: data.color,
            emissiveIntensity: 0.2
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
        
        // Edges
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMat = new THREE.LineBasicMaterial({ color: data.color, linewidth: 2 });
        const line = new THREE.LineSegments(edges, lineMat);
        group.add(line);
        group.userData.mesh = mesh;
        group.userData.edges = line;

        // Label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'label-3d';
        labelDiv.textContent = data.name;
        labelDiv.style.color = '#ffffff';
        labelDiv.style.padding = '4px 8px';
        labelDiv.style.background = 'rgba(0,0,0,0.6)';
        labelDiv.style.borderRadius = '4px';
        labelDiv.style.border = `1px solid #${data.color.toString(16).padStart(6, '0')}`;
        labelDiv.style.marginTop = '-1.5em';
        
        const label = new CSS2DObject(labelDiv);
        label.position.set(0, data.size[1]/2 + 0.5, 0);
        group.add(label);

        scene.add(group);
        containerMeshes[data.id] = group;
    });
}

function buildVolumes() {
    volumesData.forEach(data => {
        const geometry = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 32);
        const material = new THREE.MeshStandardMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...data.pos);
        scene.add(mesh);

        // Edges
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMat = new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.5 });
        const line = new THREE.LineSegments(edges, lineMat);
        line.position.set(...data.pos);
        scene.add(line);
        
        // Label
        const labelDiv = document.createElement('div');
        labelDiv.textContent = data.name;
        labelDiv.style.color = `#${data.color.toString(16).padStart(6, '0')}`;
        labelDiv.style.fontSize = '10px';
        const label = new CSS2DObject(labelDiv);
        label.position.set(data.pos[0], data.pos[1] - 0.5, data.pos[2]);
        scene.add(label);

        // Lines to connected containers
        data.connectsTo.forEach(targetId => {
            const targetGroup = containerMeshes[targetId];
            if (targetGroup) {
                const points = [];
                points.push(new THREE.Vector3(...data.pos));
                points.push(new THREE.Vector3(targetGroup.position.x, targetGroup.position.y - targetGroup.userData.mesh.geometry.parameters.height/2, targetGroup.position.z));
                const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                const lineMat = new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.4 });
                const connLine = new THREE.Line(lineGeo, lineMat);
                scene.add(connLine);
            }
        });
    });
}

function buildConnections() {
    connectionsData.forEach(data => {
        const fromGroup = containerMeshes[data.from];
        let toPos;
        if (data.to === 'external') {
            toPos = new THREE.Vector3(fromGroup.position.x + 3, fromGroup.position.y, fromGroup.position.z + 3);
        } else {
            toPos = containerMeshes[data.to].position;
        }
        
        const fromPos = fromGroup.position;
        
        // Curve
        const midPoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
        midPoint.y += 2; // arc upward
        
        const curve = new THREE.QuadraticBezierCurve3(fromPos, midPoint, toPos);
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        let material;
        if (data.dashed) {
            material = new THREE.LineDashedMaterial({
                color: data.color,
                linewidth: 2,
                scale: 1,
                dashSize: 0.3,
                gapSize: 0.1,
                transparent: true,
                opacity: 0.6
            });
        } else {
            material = new THREE.LineBasicMaterial({
                color: data.color,
                transparent: true,
                opacity: 0.6
            });
        }
        
        const line = new THREE.Line(geometry, material);
        if (data.dashed) line.computeLineDistances();
        scene.add(line);
        connectionLines.push(line);

        // Label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'port-label-3d';
        labelDiv.textContent = data.label;
        labelDiv.style.color = `#${data.color.toString(16).padStart(6, '0')}`;
        labelDiv.style.fontSize = '11px';
        labelDiv.style.background = 'rgba(0,0,0,0.5)';
        labelDiv.style.padding = '2px 4px';
        labelDiv.style.borderRadius = '3px';
        
        const label = new CSS2DObject(labelDiv);
        // Position at 50% along the curve
        const labelPos = curve.getPoint(0.5);
        label.position.copy(labelPos);
        scene.add(label);
    });
}


// --- INTERACTION ---

function onMouseMove(event) {
    const container = document.getElementById('three-container');
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
    lastInteractionTime = Date.now();
}

function onClick(event) {
    lastInteractionTime = Date.now();
    handleRaycastInteraction();
}

function onTouchStart(event) {
    if (event.touches.length > 0) {
        const container = document.getElementById('three-container');
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.touches[0].clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((event.touches[0].clientY - rect.top) / container.clientHeight) * 2 + 1;
        lastInteractionTime = Date.now();
        handleRaycastInteraction();
    }
}

function handleRaycastInteraction() {
    raycaster.setFromCamera(mouse, camera);
    const intersectable = Object.values(containerMeshes).map(g => g.userData.mesh);
    const intersects = raycaster.intersectObjects(intersectable);

    if (intersects.length > 0) {
        const object = intersects[0].object;
        const group = object.parent;
        if (group.userData.id !== 'browser') {
            focusContainer(group.userData.id);
        }
    } else {
        resetSelection();
    }
}

function resetSelection() {
    selectedContainer = null;
    closeInfoPanel();
    
    // Restore all
    Object.values(containerMeshes).forEach(group => {
        group.userData.mesh.material.opacity = 0.85;
        group.userData.edges.material.opacity = 1;
    });
    
    resetCamera();
}


// --- ACTIONS ---

function focusContainer(id) {
    const group = containerMeshes[id];
    if (!group) return;

    selectedContainer = id;
    
    // Dim others
    Object.values(containerMeshes).forEach(g => {
        if (g.userData.id === id) {
            g.userData.mesh.material.opacity = 1;
            g.userData.edges.material.opacity = 1;
        } else {
            g.userData.mesh.material.opacity = 0.2;
            g.userData.edges.material.opacity = 0.2;
        }
    });

    // Camera move
    isAnimatingCamera = true;
    const pos = group.position;
    targetCameraPos.set(pos.x + 5, pos.y + 3, pos.z + 8);
    targetCameraLookAt.copy(pos);

    showContainerInfo(id);
}

function resetCamera() {
    isAnimatingCamera = true;
    targetCameraPos.copy(defaultCameraPos);
    targetCameraLookAt.copy(defaultCameraLookAt);
    selectedContainer = null;
}

function showContainerInfo(id) {
    const data = infoData[id];
    if (!data) return;

    const panel = document.getElementById('info-panel');
    const title = panel.querySelector('.info-title');
    const body = panel.querySelector('.info-body');
    
    title.textContent = data.title;
    body.innerHTML = data.body;
    
    panel.classList.add('active');
}

function closeInfoPanel() {
    const panel = document.getElementById('info-panel');
    if (panel) panel.classList.remove('active');
}

function animateFlow() {
    if (flowActive) return;
    
    flowActive = true;
    currentFlowStep = 0;
    flowStartTime = Date.now();
    
    // Create particle
    const geo = new THREE.SphereGeometry(0.3, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    flowParticle = new THREE.Mesh(geo, mat);
    scene.add(flowParticle);
    
    flowParticleLight = new THREE.PointLight(0xffffff, 2, 5);
    scene.add(flowParticleLight);
    
    const labelDiv = document.createElement('div');
    labelDiv.style.color = '#ffffff';
    labelDiv.style.background = 'rgba(0,0,0,0.8)';
    labelDiv.style.padding = '2px 6px';
    labelDiv.style.borderRadius = '4px';
    labelDiv.style.border = '1px solid #ffffff';
    labelDiv.style.fontSize = '12px';
    labelDiv.style.fontWeight = 'bold';
    flowLabel = new CSS2DObject(labelDiv);
    scene.add(flowLabel);
}

// --- UPDATE LOOP ---

function updateFlow() {
    if (!flowActive) return;
    
    const step = flowPath[currentFlowStep];
    const now = Date.now();
    const elapsed = (now - flowStartTime) / 1000;
    
    if (elapsed > step.duration) {
        // Next step
        currentFlowStep++;
        if (currentFlowStep >= flowPath.length) {
            // End flow
            flowActive = false;
            scene.remove(flowParticle);
            scene.remove(flowParticleLight);
            scene.remove(flowLabel);
            return;
        }
        flowStartTime = now;
        return; // process next frame
    }
    
    const progress = elapsed / step.duration;
    
    const fromPos = containerMeshes[step.from].position;
    let toPos;
    if (step.to === 'external') {
        toPos = new THREE.Vector3(fromPos.x + 3, fromPos.y, fromPos.z + 3);
    } else {
        toPos = containerMeshes[step.to].position;
    }
    
    // Calculate arc
    const midPoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
    midPoint.y += 1.5;
    
    const curve = new THREE.QuadraticBezierCurve3(fromPos, midPoint, toPos);
    const currentPos = curve.getPoint(progress);
    
    flowParticle.position.copy(currentPos);
    flowParticleLight.position.copy(currentPos);
    flowLabel.position.copy(currentPos);
    flowLabel.position.y += 0.8;
    
    flowLabel.element.textContent = step.label;
    
    // Update color based on target container
    const toGroup = containerMeshes[step.to];
    const color = toGroup ? toGroup.userData.color : 0xffffff;
    flowParticle.material.color.setHex(color);
    flowParticleLight.color.setHex(color);
    flowLabel.element.style.borderColor = `#${color.toString(16).padStart(6, '0')}`;
}

function updateHoverAndPulse() {
    time += 0.05;
    
    // Raycast hover
    raycaster.setFromCamera(mouse, camera);
    const intersectable = Object.values(containerMeshes).map(g => g.userData.mesh);
    const intersects = raycaster.intersectObjects(intersectable);
    
    const newHover = intersects.length > 0 ? intersects[0].object.parent : null;
    
    if (newHover !== hoveredContainer) {
        // Reset old hover
        if (hoveredContainer) {
            hoveredContainer.scale.setScalar(1.0);
        }
        hoveredContainer = newHover;
        
        // Cursor
        const container = document.getElementById('three-container');
        if (container) container.style.cursor = hoveredContainer ? 'pointer' : 'default';
    }
    
    // Apply effects
    Object.values(containerMeshes).forEach(group => {
        // Hover scale
        if (group === hoveredContainer && group.userData.id !== 'browser') {
            group.scale.setScalar(1.05);
        }
        
        // Pulse emissive
        if (group.userData.mesh) {
            const baseIntensity = (group === hoveredContainer || group.userData.id === selectedContainer) ? 0.5 : 0.2;
            group.userData.mesh.material.emissiveIntensity = baseIntensity + Math.sin(time + group.position.x) * 0.1;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);

    // Auto rotate if idle
    if (Date.now() - lastInteractionTime > 5000 && !isAnimatingCamera && !selectedContainer) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
    } else {
        controls.autoRotate = false;
    }

    // Camera animation
    if (isAnimatingCamera) {
        camera.position.lerp(targetCameraPos, 0.05);
        controls.target.lerp(targetCameraLookAt, 0.05);
        
        if (camera.position.distanceTo(targetCameraPos) < 0.1) {
            isAnimatingCamera = false;
        }
    }

    updateHoverAndPulse();
    updateFlow();

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

function resize() {
    const container = document.getElementById('three-container');
    if (!container || !camera || !renderer) return;
    
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
}

// --- EXPORT API ---

window.inceptionScene = {
    init,
    animateFlow,
    resetCamera,
    focusContainer,
    resize,
    showContainerInfo
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
