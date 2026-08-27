/* ============================================
   INCEPTION — App Controller
   Navigation, animations, interactions
   ============================================ */

(function() {
  'use strict';

  // ---- DOM Ready ----
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initNavigation();
    initScrollAnimations();
    initExpandableSections();
    initConceptTabs();
    initFlowSteps();
    initInfoPanel();
    initArchitectureControls();
  }

  // ---- Navigation ----
  function initNavigation() {
    const nav = document.getElementById('main-nav');
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    const navLinks = document.querySelectorAll('.nav-link');

    // Scroll effect
    let lastScroll = 0;
    window.addEventListener('scroll', function() {
      const scrollY = window.scrollY;
      if (scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
      lastScroll = scrollY;
    }, { passive: true });

    // Mobile toggle
    if (toggle) {
      toggle.addEventListener('click', function() {
        links.classList.toggle('open');
        toggle.classList.toggle('active');
      });
    }

    // Smooth scroll for nav links
    navLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const target = document.getElementById(targetId);
        if (target) {
          const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 64;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
        // Close mobile menu
        if (links.classList.contains('open')) {
          links.classList.remove('open');
          toggle.classList.remove('active');
        }
      });
    });

    // Active link tracking
    const sections = document.querySelectorAll('.section');
    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -70% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(function(link) {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(function(section) {
      observer.observe(section);
    });
  }

  // ---- Scroll Animations (fade-in) ----
  function initScrollAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');
    
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.1
    });

    fadeElements.forEach(function(el) {
      observer.observe(el);
    });
  }

  // ---- Expandable Sections ----
  function initExpandableSections() {
    const triggers = document.querySelectorAll('.expand-trigger');

    triggers.forEach(function(trigger) {
      trigger.addEventListener('click', function() {
        const expandable = this.closest('.expandable');
        if (expandable) {
          expandable.classList.toggle('open');
        }
      });
    });
  }

  // ---- Concept Tabs ----
  function initConceptTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        const card = this.closest('.concept-card');
        if (!card) return;

        const target = this.getAttribute('data-target');

        // Deactivate all tabs in this card
        card.querySelectorAll('.tab-btn').forEach(function(b) {
          b.classList.remove('active');
        });
        card.querySelectorAll('.concept-tab').forEach(function(t) {
          t.classList.remove('active');
        });

        // Activate selected tab
        this.classList.add('active');
        var tabContent = card.querySelector('.concept-tab[data-tab="' + target + '"]');
        if (tabContent) {
          tabContent.classList.add('active');
        }
      });
    });
  }

  // ---- Flow Steps Animation ----
  function initFlowSteps() {
    const steps = document.querySelectorAll('.flow-step');
    
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          // Activate steps sequentially with delay
          const step = entry.target;
          const index = parseInt(step.getAttribute('data-step')) - 1;
          setTimeout(function() {
            step.classList.add('active');
          }, index * 150);
          observer.unobserve(step);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -100px 0px',
      threshold: 0.2
    });

    steps.forEach(function(step) {
      observer.observe(step);
    });
  }

  // ---- Info Panel ----
  function initInfoPanel() {
    const panel = document.getElementById('info-panel');
    if (!panel) return;

    const closeBtn = panel.querySelector('.info-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        panel.classList.remove('active');
      });
    }

    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && panel.classList.contains('active')) {
        panel.classList.remove('active');
      }
    });
  }

  // ---- Architecture Controls ----
  function initArchitectureControls() {
    var animateBtn = document.getElementById('animate-flow-btn');
    var resetBtn = document.getElementById('reset-camera-btn');

    if (animateBtn) {
      animateBtn.addEventListener('click', function() {
        if (window.inceptionScene && window.inceptionScene.animateFlow) {
          window.inceptionScene.animateFlow();
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        if (window.inceptionScene && window.inceptionScene.resetCamera) {
          window.inceptionScene.resetCamera();
        }
      });
    }

    // Handle resize
    window.addEventListener('resize', function() {
      if (window.inceptionScene && window.inceptionScene.resize) {
        window.inceptionScene.resize();
      }
    });
  }

})();
