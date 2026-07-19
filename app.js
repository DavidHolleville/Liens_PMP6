// --- NAVIGATION STATE ---
let currentPath = ['root']; // Éléments: 'root', 'NomCategorie', 'NomSousCategorie'
let searchQuery = "";
let deferredInstallPrompt = null;

// --- DÉMARRAGE DE L'APPLICATION ---
document.addEventListener('DOMContentLoaded', () => {
    initBubbles();
    initEventListeners();
    initPwa();
    initRequestModal();
    render();
});

// --- GENERATEUR DE BULLES SOUS-MARINES ---
function initBubbles() {
    const container = document.getElementById('bubbleContainer');
    if (!container) return;
    
    // Créer des bulles initiales réparties à différentes hauteurs
    for (let i = 0; i < 15; i++) {
        createBubble(container, true);
    }
    
    // Générer continuellement de nouvelles bulles
    setInterval(() => {
        createBubble(container, false);
    }, 1200);
}

function createBubble(container, initial = false) {
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    
    // Propriétés aléatoires
    const size = Math.random() * 35 + 8; // Entre 8px et 43px
    const left = Math.random() * 100; // Position de 0% à 100%
    const duration = Math.random() * 10 + 8; // Durée de montée 8s à 18s
    const delay = initial ? -Math.random() * duration : 0; // Délai négatif pour répartir au démarrage
    
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${left}%`;
    bubble.style.animationDuration = `${duration}s`;
    bubble.style.animationDelay = `${delay}s`;
    
    // Retirer la bulle après l'animation
    bubble.addEventListener('animationend', () => {
        bubble.remove();
    });
    
    container.appendChild(bubble);
}

// --- CONFIGURATION DES EVENEMENTS ---
function initEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const backBtn = document.getElementById('backBtn');
    const pwaInstallBtn = document.getElementById('pwaInstallBtn');
    
    // Recherche globale en direct
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        if (searchQuery.length > 0) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
        render();
    });
    
    // Bouton de nettoyage de la recherche
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = "";
        searchQuery = "";
        clearSearchBtn.classList.add('hidden');
        searchInput.focus();
        render();
    });
    
    // Bouton de retour en arrière
    backBtn.addEventListener('click', () => {
        goBack();
    });
    
    // Bouton d'installation de la PWA
    pwaInstallBtn.addEventListener('click', () => {
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            deferredInstallPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('L\'utilisateur a installé la PWA PMP6');
                }
                deferredInstallPrompt = null;
                pwaInstallBtn.classList.add('hidden');
            });
        }
    });
}

// --- NAVIGATION ACTIONS ---
function navigateTo(pathArray) {
    currentPath = [...pathArray];
    // Vider le champ de recherche lors de la navigation dans les dossiers
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (searchQuery !== "") {
        searchQuery = "";
        searchInput.value = "";
        clearSearchBtn.classList.add('hidden');
    }
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
    if (currentPath.length > 1) {
        currentPath.pop();
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// --- STRUCTURE D'ICONES SVG REUTILISABLES ---
const SVG_ICONS = {
    folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
             </svg>`,
    externalLink: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                   </svg>`
};

// --- RENDER FUNCTION (MOTEUR D'AFFICHAGE) ---
function render() {
    const gridContainer = document.getElementById('gridContainer');
    const breadcrumbs = document.getElementById('breadcrumbs');
    const backBtn = document.getElementById('backBtn');
    const itemsCount = document.getElementById('itemsCount');
    const noResults = document.getElementById('noResults');
    
    // Réinitialisation de l'affichage
    gridContainer.innerHTML = "";
    noResults.classList.add('hidden');
    
    // 1. MODE RECHERCHE ACTIVE
    if (searchQuery.length > 0) {
        renderSearch(gridContainer, noResults, breadcrumbs, backBtn, itemsCount);
        return;
    }
    
    // 2. MODE NAVIGATION ARBORESCENTE
    backBtn.classList.toggle('hidden', currentPath.length === 1);
    
    // Rendu des Breadcrumbs (Fil d'Ariane)
    renderBreadcrumbs(breadcrumbs);
    
    // Niveau 1 : Liste des Catégories (Accueil)
    if (currentPath.length === 1) {
        const categories = PMP6_DATA.categories;
        let count = 0;
        
        for (let catName in categories) {
            count++;
            const catData = categories[catName];
            
            // Calculer le nombre de liens total de cette catégorie
            let linkCount = catData.direct_links.length;
            for (let sub in catData.subcategories) {
                linkCount += catData.subcategories[sub].links.length;
            }
            const subCount = Object.keys(catData.subcategories).length;
            
            let subtitle = "";
            if (subCount > 0) {
                subtitle = `${subCount} sous-catégorie${subCount > 1 ? 's' : ''}`;
            } else {
                subtitle = `${linkCount} lien${linkCount > 1 ? 's' : ''}`;
            }
            
            const card = createCard({
                type: "category",
                category: catName,
                title: catName,
                subtitle: subtitle,
                image: catData.image,
                tag: "Catégorie",
                icon: SVG_ICONS.folder,
                onClick: () => {
                    navigateTo(['root', catName]);
                }
            });
            gridContainer.appendChild(card);
        }
        
        itemsCount.textContent = `${count} catégorie${count > 1 ? 's' : ''}`;
    }
    
    // Niveau 2 : Contenu d'une Catégorie (Sous-catégories + Liens directs)
    else if (currentPath.length === 2) {
        const catName = currentPath[1];
        const catData = PMP6_DATA.categories[catName];
        
        if (!catData) {
            navigateTo(['root']);
            return;
        }
        
        const subcategories = catData.subcategories;
        const directLinks = catData.direct_links;
        let subCount = Object.keys(subcategories).length;
        
        // Cas particulier : La catégorie n'a AUCUNE sous-catégorie. On affiche directement les liens.
        if (subCount === 0) {
            directLinks.forEach(link => {
                const card = createCard({
                    type: "link",
                    category: catName,
                    subcategory: "",
                    name: link.name,
                    title: link.name,
                    subtitle: "Ouvrir le lien",
                    image: link.image,
                    tag: "Lien externe",
                    icon: SVG_ICONS.externalLink,
                    isLink: true,
                    url: link.url,
                    onClick: () => window.open(link.url, '_blank')
                });
                gridContainer.appendChild(card);
            });
            itemsCount.textContent = `${directLinks.length} lien${directLinks.length > 1 ? 's' : ''}`;
        }
        // Sinon : On affiche les dossiers de sous-catégories ET les liens directs s'il y en a.
        else {
            let totalItems = 0;
            
            // Afficher les sous-catégories
            for (let subName in subcategories) {
                totalItems++;
                const subData = subcategories[subName];
                const linkCount = subData.links.length;
                
                const card = createCard({
                    type: "subcategory",
                    category: catName,
                    subcategory: subName,
                    title: subName,
                    subtitle: `${linkCount} lien${linkCount > 1 ? 's' : ''}`,
                    image: subData.image,
                    tag: "Sous-catégorie",
                    icon: SVG_ICONS.folder,
                    onClick: () => navigateTo(['root', catName, subName])
                });
                gridContainer.appendChild(card);
            }
            
            // Afficher les liens directs (sans sous-catégorie)
            directLinks.forEach(link => {
                totalItems++;
                const card = createCard({
                    type: "link",
                    category: catName,
                    subcategory: "",
                    name: link.name,
                    title: link.name,
                    subtitle: "Ouvrir le lien",
                    image: link.image,
                    tag: "Lien direct",
                    icon: SVG_ICONS.externalLink,
                    isLink: true,
                    url: link.url,
                    onClick: () => window.open(link.url, '_blank')
                });
                gridContainer.appendChild(card);
            });
            
            itemsCount.textContent = `${totalItems} élément${totalItems > 1 ? 's' : ''}`;
        }
    }
    
    // Niveau 3 : Contenu d'une Sous-catégorie (Liste de liens)
    else if (currentPath.length === 3) {
        const catName = currentPath[1];
        const subName = currentPath[2];
        const subData = PMP6_DATA.categories[catName]?.subcategories[subName];
        
        if (!subData) {
            navigateTo(['root', catName]);
            return;
        }
        
        subData.links.forEach(link => {
            const card = createCard({
                type: "link",
                category: catName,
                subcategory: subName,
                name: link.name,
                title: link.name,
                subtitle: "Ouvrir le lien",
                image: link.image,
                tag: "Lien externe",
                icon: SVG_ICONS.externalLink,
                isLink: true,
                url: link.url,
                onClick: () => window.open(link.url, '_blank')
            });
            gridContainer.appendChild(card);
        });
        
        const count = subData.links.length;
        itemsCount.textContent = `${count} lien${count > 1 ? 's' : ''}`;
    }
}

// --- CREATION DE CARTES DYNAMIQUE ---
function createCard({ type, category, subcategory = "", name = "", title, subtitle, image, tag, icon, isLink = false, url = null, onClick, pathBadgeText = null }) {
    const card = document.createElement('a');
    card.className = `card ${isLink ? 'card-link' : ''}`;
    card.href = "#";
    
    // Image de fond
    const bg = document.createElement('div');
    bg.className = 'card-bg';
    bg.style.backgroundImage = `url('${image}')`;
    card.appendChild(bg);
    
    // Voile sombre
    const overlay = document.createElement('div');
    overlay.className = 'card-overlay';
    card.appendChild(overlay);
    
    // Badge de chemin (recherche uniquement)
    if (pathBadgeText) {
        const badge = document.createElement('div');
        badge.className = 'card-path-badge';
        badge.textContent = pathBadgeText;
        card.appendChild(badge);
    }
    
    // Icône de type (uniquement s'il s'agit d'un lien externe direct)
    if (isLink) {
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'card-icon';
        iconWrapper.innerHTML = icon;
        card.appendChild(iconWrapper);
    }
    
    // Petit bouton de copie du lien (si type lien)
    if (isLink && url) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'card-copy-btn';
        copyBtn.title = 'Copier le lien';
        copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span class="copy-tooltip">Copier le lien</span>
        `;
        
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            navigator.clipboard.writeText(url).then(() => {
                const tooltip = copyBtn.querySelector('.copy-tooltip');
                tooltip.textContent = 'Copié !';
                copyBtn.classList.add('copied');
                
                setTimeout(() => {
                    tooltip.textContent = 'Copier le lien';
                    copyBtn.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Erreur lors de la copie:', err);
            });
        });
        
        card.appendChild(copyBtn);
    }
    
    // Contenu textuel
    const content = document.createElement('div');
    content.className = 'card-content';
    
    const tagEl = document.createElement('span');
    tagEl.className = 'card-tag';
    tagEl.textContent = tag;
    content.appendChild(tagEl);
    
    const titleEl = document.createElement('h2');
    titleEl.className = 'card-title';
    titleEl.textContent = title;
    content.appendChild(titleEl);
    
    const subtitleEl = document.createElement('span');
    subtitleEl.className = 'card-subtitle';
    subtitleEl.textContent = subtitle;
    content.appendChild(subtitleEl);
    
    card.appendChild(content);
    
    // Événement au clic
    card.addEventListener('click', (e) => {
        e.preventDefault();
        onClick();
    });
    
    return card;
}

// --- RENDU DU FIL D'ARIANE (BREADCRUMBS) ---
function renderBreadcrumbs(container) {
    container.innerHTML = "";
    
    // Accueil
    const homeSpan = document.createElement('span');
    homeSpan.className = `breadcrumb-item ${currentPath.length === 1 ? 'active' : ''}`;
    homeSpan.textContent = "Accueil";
    homeSpan.addEventListener('click', () => navigateTo(['root']));
    container.appendChild(homeSpan);
    
    // Catégorie
    if (currentPath.length >= 2) {
        const catName = currentPath[1];
        const catSpan = document.createElement('span');
        catSpan.className = `breadcrumb-item ${currentPath.length === 2 ? 'active' : ''}`;
        catSpan.textContent = catName;
        catSpan.addEventListener('click', () => navigateTo(['root', catName]));
        container.appendChild(catSpan);
    }
    
    // Sous-catégorie
    if (currentPath.length >= 3) {
        const subName = currentPath[2];
        const subSpan = document.createElement('span');
        subSpan.className = `breadcrumb-item active`;
        subSpan.textContent = subName;
        container.appendChild(subSpan);
    }
}

// --- AFFICHAGE DU MODE RECHERCHE ---
function renderSearch(gridContainer, noResults, breadcrumbs, backBtn, itemsCount) {
    backBtn.classList.remove('hidden');
    
    // Fil d'Ariane de recherche
    breadcrumbs.innerHTML = "";
    const searchSpan = document.createElement('span');
    searchSpan.className = "breadcrumb-item active";
    searchSpan.textContent = `Recherche : "${searchQuery}"`;
    breadcrumbs.appendChild(searchSpan);
    
    const queryLower = searchQuery.toLowerCase();
    
    // Filtrer la liste à plat de tous les liens
    const results = PMP6_DATA.all_links.filter(link => {
        return (
            link.name.toLowerCase().includes(queryLower) ||
            link.category.toLowerCase().includes(queryLower) ||
            link.subcategory.toLowerCase().includes(queryLower)
        );
    });
    
    if (results.length === 0) {
        noResults.classList.remove('hidden');
        itemsCount.textContent = "0 résultat";
        return;
    }
    
    results.forEach(link => {
        // Construire le chemin textuel du badge
        let pathBadge = link.category;
        if (link.subcategory) {
            pathBadge += ` > ${link.subcategory}`;
        }
        
        const card = createCard({
            type: "link",
            category: link.category,
            subcategory: link.subcategory,
            name: link.name,
            title: link.name,
            subtitle: "Ouvrir le lien",
            image: link.image,
            tag: "Lien externe",
            icon: SVG_ICONS.externalLink,
            isLink: true,
            url: link.url,
            pathBadgeText: pathBadge,
            onClick: () => window.open(link.url, '_blank')
        });
        gridContainer.appendChild(card);
    });
    
    itemsCount.textContent = `${results.length} résultat${results.length > 1 ? 's' : ''}`;
}

// --- COMPORTEMENT PWA & HORS LIGNE ---
function initPwa() {
    // 1. Enregistrement du Service Worker pour le fonctionnement hors ligne
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker enregistré avec succès !', reg.scope))
                .catch(err => console.error('Échec de l\'enregistrement du Service Worker:', err));
        });
    }
    
    // 2. Gestion de l'installation de la PWA
    window.addEventListener('beforeinstallprompt', (e) => {
        // Empêcher l'affichage de la bannière par défaut du navigateur
        e.preventDefault();
        // Conserver l'événement pour plus tard
        deferredInstallPrompt = e;
        // Afficher le bouton d'installation personnalisé dans le header
        const pwaInstallBtn = document.getElementById('pwaInstallBtn');
        if (pwaInstallBtn) {
            pwaInstallBtn.classList.remove('hidden');
        }
    });
    
    window.addEventListener('appinstalled', (e) => {
        console.log('L\'application PMP6 a été installée avec succès !');
        // Masquer le bouton d'installation
        const pwaInstallBtn = document.getElementById('pwaInstallBtn');
        if (pwaInstallBtn) {
            pwaInstallBtn.classList.add('hidden');
        }
        deferredInstallPrompt = null;
    });
}

// --- LOGIQUE DE FORMULAIRE DE REQUÊTE DE LIEN ---
function initRequestModal() {
    const modal = document.getElementById('requestModal');
    const openBtn = document.getElementById('requestLinkBtn');
    const closeBtn = document.getElementById('closeRequestModalBtn');
    const backdrop = document.getElementById('modalBackdrop');
    const form = document.getElementById('requestLinkForm');
    
    if (!modal) return;
    
    // Ouverture
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            if (form) form.reset();
        });
    }
    
    // Fermeture
    if (closeBtn) closeBtn.addEventListener('click', closeRequestModal);
    if (backdrop) backdrop.addEventListener('click', closeRequestModal);
    
    // Soumission du formulaire
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitRequestForm();
        });
    }
}

function closeRequestModal() {
    const modal = document.getElementById('requestModal');
    if (modal) modal.classList.add('hidden');
}

function submitRequestForm() {
    const requester = document.getElementById('reqRequester').value.trim();
    const category = document.getElementById('reqCategory').value.trim();
    const subcategory = document.getElementById('reqSubcategory').value.trim();
    const name = document.getElementById('reqName').value.trim();
    const url = document.getElementById('reqUrl').value.trim();
    const image = document.getElementById('reqImage').value.trim();
    
    if (!requester || !category || !name || !url) {
        alert("Veuillez remplir tous les champs obligatoires.");
        return;
    }
    
    // Destinataire et objet
    const emailTo = "david.holleville@obspm.fr";
    const subject = `PMP6 - Demande d'ajout de lien par ${requester}`;
    
    // Corps du message formaté
    const body = 
        `Demande d'ajout de lien PMP6\n` +
        `-----------------------------------------\n` +
        `Nom du demandeur : ${requester}\n` +
        `Rubrique         : ${category}\n` +
        `Sous-rubrique    : ${subcategory || 'Aucune'}\n` +
        `Texte à afficher : ${name}\n` +
        `Lien (URL)       : ${url}\n` +
        `Image à afficher : ${image || 'Aucune (Défaut)'}\n` +
        `-----------------------------------------\n`;
        
    // Générer le mailto URL
    const mailtoUrl = `mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Ouvrir l'application de messagerie de l'utilisateur
    window.location.href = mailtoUrl;
    
    // Fermer la modale
    closeRequestModal();
}
