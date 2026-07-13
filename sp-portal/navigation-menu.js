// Service Provider Navigation Menu - Enhanced Redirect Component

(function () {
  'use strict';

  // Navigation menu structure with all sections
  const navStructure = [
    {
      section: 'Planning & Operations',
      items: [
        {
          id: 'week-planner',
          title: 'Week Planner',
          description: 'Plan routes and crews for the week',
          icon: 'bi-calendar-week',
          soon: true,
        },
        {
          id: 'route-balance',
          title: 'Route Balance',
          description: 'Balance stops across live routes',
          icon: 'bi-distribute-horizontal',
          link: '../route-balance/index.html',
        },
        {
          id: 'daily-ops',
          title: 'Daily Operations',
          description: 'Run and adjust today\'s operation',
          icon: 'bi-clock-history',
          soon: true,
        },
      ],
    },
    {
      section: 'Setup',
      items: [
        {
          id: 'vendor-records',
          title: 'Vendor',
          description: 'Vendor records and onboarding',
          icon: 'bi-building',
          link: '../profile/index.html',
        },
        {
          id: 'vehicles',
          title: 'Vehicles',
          description: 'Fleet, VRNs and vehicle status',
          icon: 'bi-truck',
          link: '../vehicles/index.html',
        },
        {
          id: 'assets',
          title: 'Assets',
          description: 'Scanners, devices and equipment',
          icon: 'bi-phone',
          soon: true,
        },
      ],
    },
    {
      section: 'Contract Management',
      items: [
        {
          id: 'contracts',
          title: 'Contracts',
          description: 'Routes, loops and agreements',
          icon: 'bi-file-earmark-text',
          link: '../contracts/index.html',
        },
        {
          id: 'feed',
          title: 'Feed',
          description: 'SOPs, tutorials and updates',
          icon: 'bi-journal-bookmark',
          link: '../sop-feed/index.html',
        },
      ],
    },
    {
      section: 'Announcements',
      items: [
        {
          id: 'announcements',
          title: 'Announcements',
          description: 'Messages from DHL',
          icon: 'bi-megaphone-fill',
          soon: false,
        },
      ],
    },
    {
      section: 'Compliance',
      items: [
        {
          id: 'service-provider-profile',
          title: 'Service Provider Profile',
          description: 'Company details and documents',
          icon: 'bi-person-vcard',
          link: '../profile/index.html',
        },
        {
          id: 'compliance-training',
          title: 'Compliance',
          description: 'Training status and renewals',
          icon: 'bi-shield-check',
          soon: true,
        },
        {
          id: 'vetting',
          title: 'Vetting',
          description: 'Driver vetting and checks',
          icon: 'bi-search',
          soon: true,
        },
      ],
    },
    {
      section: 'Billing',
      items: [
        {
          id: 'invoices',
          title: 'Invoice Processing',
          description: 'Submit and track invoices',
          icon: 'bi-receipt',
          soon: true,
        },
        {
          id: 'deductions',
          title: 'Deductions',
          description: 'Liquidation damages and adjustments',
          icon: 'bi-calculator',
          soon: true,
        },
        {
          id: 'adhoc-invoices',
          title: 'Adhoc Invoice Management',
          description: 'One-off works invoicing',
          icon: 'bi-file-plus',
          soon: true,
        },
      ],
    },
    {
      section: 'Performance',
      items: [
        {
          id: 'financial-insights',
          title: 'Financial Insights',
          description: 'Income, targets and trends',
          icon: 'bi-graph-up',
          soon: true,
        },
        {
          id: 'operation-insights',
          title: 'Operation Insights',
          description: 'SPR, AFD and time windows',
          icon: 'bi-bar-chart',
          soon: true,
        },
        {
          id: 'vendor-performance',
          title: 'Vendor Performance',
          description: 'Scorecards by vendor',
          icon: 'bi-speedometer',
          soon: true,
        },
      ],
    },
    {
      section: 'Vendor Requests',
      items: [
        {
          id: 'vendor-requests',
          title: 'Vendor Requests',
          description: 'Open requests and approvals',
          icon: 'bi-inbox',
          soon: false,
        },
      ],
    },
    {
      section: 'Trace & Queries',
      items: [
        {
          id: 'trace-queries',
          title: 'Trace & Queries',
          description: 'Track shipments and raise queries',
          icon: 'bi-geo-alt',
          soon: false,
        },
      ],
    },
  ];

  // Initialize navigation menu
  function initNavigationMenu() {
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'sp-nav-menu-backdrop';
    backdrop.id = 'spNavMenuBackdrop';
    document.body.appendChild(backdrop);

    // Create menu container
    const menu = document.createElement('div');
    menu.className = 'sp-nav-menu';
    menu.id = 'spNavMenu';

    // Create header
    const header = document.createElement('div');
    header.className = 'sp-nav-menu-header';
    header.innerHTML = `
      <h2 class="sp-nav-menu-header-title">Navigate</h2>
      <button type="button" class="sp-nav-menu-close" aria-label="Close navigation menu">
        <i class="bi bi-x-lg"></i>
      </button>
    `;
    menu.appendChild(header);

    // Create content
    const content = document.createElement('div');
    content.className = 'sp-nav-menu-content';

    // Build menu sections
    navStructure.forEach((section) => {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'sp-nav-section';

      // Section title
      const sectionTitle = document.createElement('h3');
      sectionTitle.className = 'sp-nav-section-title';
      sectionTitle.textContent = section.section;
      sectionDiv.appendChild(sectionTitle);

      // Items grid
      const itemsGrid = document.createElement('div');
      itemsGrid.className = 'sp-nav-items';
      if (section.items.length === 1) {
        itemsGrid.classList.add('sp-nav-items-full');
      }

      section.items.forEach((item) => {
        const itemElement = document.createElement('a');
        itemElement.className = 'sp-nav-item';
        if (item.soon) {
          itemElement.classList.add('disabled');
        }
        if (item.link) {
          itemElement.href = item.link;
        } else {
          itemElement.href = '#';
          itemElement.style.cursor = item.soon ? 'not-allowed' : 'pointer';
        }

        let html = `
          <i class="bi ${item.icon} sp-nav-item-icon"></i>
          <h4 class="sp-nav-item-title">${escapeHtml(item.title)}</h4>
          <p class="sp-nav-item-description">${escapeHtml(item.description)}</p>
        `;

        if (item.soon) {
          html += '<span class="sp-nav-item-badge">Soon</span>';
        }

        itemElement.innerHTML = html;

        if (item.soon) {
          itemElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
          });
        }

        itemsGrid.appendChild(itemElement);
      });

      sectionDiv.appendChild(itemsGrid);
      content.appendChild(sectionDiv);
    });

    menu.appendChild(content);

    // Create portal switch section
    const portalSwitch = document.createElement('div');
    portalSwitch.className = 'sp-nav-portal-switch';
    portalSwitch.innerHTML = `
      <span class="sp-nav-portal-switch-title">Switch Portal</span>
      <a href="../../dhl/access-select/index.html" class="sp-nav-portal-btn">
        DHL Administration
        <i class="bi bi-arrow-right"></i>
      </a>
    `;
    menu.appendChild(portalSwitch);

    document.body.appendChild(menu);

    // Event listeners
    const closeBtn = header.querySelector('.sp-nav-menu-close');
    closeBtn.addEventListener('click', closeMenu);
    backdrop.addEventListener('click', closeMenu);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    });
  }

  // Open menu
  function openMenu() {
    const menu = document.getElementById('spNavMenu');
    const backdrop = document.getElementById('spNavMenuBackdrop');
    if (menu && backdrop) {
      menu.classList.add('active');
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  // Close menu
  function closeMenu() {
    const menu = document.getElementById('spNavMenu');
    const backdrop = document.getElementById('spNavMenuBackdrop');
    if (menu && backdrop) {
      menu.classList.remove('active');
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Utility function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigationMenu);
  } else {
    initNavigationMenu();
  }

  // Expose functions globally
  window.spNavigation = {
    openMenu,
    closeMenu,
  };
})();
