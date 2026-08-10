import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './AccessSelect.module.css';

const leftVariants = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

interface OptionRowProps {
  onClick: () => void;
  icon: string;
  iconClassName: string;
  title: string;
  badge: string;
  badgeClassName: string;
  description: string;
  arrowClassName: string;
}

function OptionRow({ onClick, icon, iconClassName, title, badge, badgeClassName, description, arrowClassName }: OptionRowProps) {
  return (
    <motion.div
      variants={rowVariants}
      whileHover={{ x: 6 }}
      whileTap={{ scale: 0.98 }}
      className={styles.optionRow}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
    >
      <span className={styles.optionAccent} aria-hidden="true" />
      <div className={`${styles.optionIcon} ${iconClassName}`}>
        <i className={`bi ${icon}`}></i>
      </div>
      <div className={styles.optionBody}>
        <div className={styles.optionHeader}>
          <h2>{title}</h2>
          <span className={`${styles.badge} ${badgeClassName}`}>{badge}</span>
        </div>
        <p>{description}</p>
      </div>
      <div className={`${styles.optionArrow} ${arrowClassName}`}>
        <i className="bi bi-arrow-right"></i>
      </div>
    </motion.div>
  );
}

export function AccessSelect() {
  const navigate = useNavigate();

  return (
    <div className={styles.accessSelectPage}>
      <motion.div className={styles.leftPanel} variants={leftVariants} initial="hidden" animate="show">
        <span className={styles.blobOne} aria-hidden="true" />
        <span className={styles.blobTwo} aria-hidden="true" />

        <div className={styles.leftContent}>
          <motion.div
            className={styles.logo}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          >
            <i className="bi bi-grid-1x2-fill"></i>
          </motion.div>
          <h1>Select Access</h1>
          <p>Choose your portal to get started. One platform, three tailored experiences — pick the one that fits your role.</p>

          <div className={styles.leftFooter}>
            <span className={styles.leftFooterDot} />
            <span>Logix Platform</span>
          </div>
        </div>
      </motion.div>

      <div className={styles.rightPanel}>
        <motion.div className={styles.optionsList} variants={listVariants} initial="hidden" animate="show">
          <OptionRow
            onClick={() => (window.location.href = 'https://www.dhl.com')}
            icon="bi-building"
            iconClassName={styles.iconDhl}
            title="DHL Administration"
            badge="ADMIN"
            badgeClassName={styles.badgeDhl}
            description="System management, reporting & compliance tracking."
            arrowClassName={styles.arrowDhl}
          />

          <OptionRow
            onClick={() => navigate('/login')}
            icon="bi-truck"
            iconClassName={styles.iconSp}
            title="Service Provider Portal"
            badge="PORTAL"
            badgeClassName={styles.badgeSp}
            description="Manage operations, drivers, vehicles & routes."
            arrowClassName={styles.arrowSp}
          />

          <OptionRow
            onClick={() => navigate('/driver-login')}
            icon="bi-truck-front"
            iconClassName={styles.iconDriver}
            title="Driver Portal"
            badge="DRIVER"
            badgeClassName={styles.badgeDriver}
            description="Earnings, performance, deductions & invoices."
            arrowClassName={styles.arrowDriver}
          />
        </motion.div>
      </div>
    </div>
  );
}
