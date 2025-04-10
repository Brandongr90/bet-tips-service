const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { User, Role, Profile, Subscription, Sport, League, Bookmaker } = require('../models');
const logger = require('../utils/logger');

/**
 * Script para inicializar datos esenciales
 */
const seed = async () => {
  try {
    logger.info('Iniciando carga de datos iniciales...');
    
    // Sincronizar modelos con la base de datos (sin forzar)
    await sequelize.sync({ force: false });
    
    // 1. Crear roles
    const roles = [
      { name: 'admin', description: 'Administrador con acceso completo' },
      { name: 'tipster', description: 'Puede crear y publicar tips' },
      { name: 'user', description: 'Usuario regular con acceso limitado según su suscripción' }
    ];
    
    logger.info('Creando roles...');
    for (const role of roles) {
      await Role.findOrCreate({
        where: { name: role.name },
        defaults: role
      });
    }
    
    // 2. Crear suscripciones básicas
    const subscriptions = [
      { 
        name: 'Gratis', 
        description: 'Acceso básico con funciones limitadas', 
        price: 0.00, 
        duration_days: 30, 
        features: { daily_tips: 1, parlays: false, historical_data: false }
      },
      { 
        name: 'Premium', 
        description: 'Acceso a todos los tips y estadísticas básicas', 
        price: 9.99, 
        duration_days: 30, 
        features: { daily_tips: 'unlimited', parlays: true, historical_data: true }
      },
      { 
        name: 'VIP', 
        description: 'Acceso completo con funciones premium y análisis', 
        price: 19.99, 
        duration_days: 30, 
        features: { daily_tips: 'unlimited', parlays: true, historical_data: true, premium_analytics: true }
      }
    ];
    
    logger.info('Creando suscripciones...');
    for (const subscription of subscriptions) {
      await Subscription.findOrCreate({
        where: { name: subscription.name },
        defaults: subscription
      });
    }
    
    // 3. Crear deportes básicos
    const sports = [
      { name: 'Fútbol', description: 'Partidos de fútbol de varias ligas' },
      { name: 'Baloncesto', description: 'Partidos de baloncesto de varias ligas' },
      { name: 'Tenis', description: 'Partidos de tenis de varios torneos' },
      { name: 'Béisbol', description: 'Partidos de béisbol de varias ligas' },
      { name: 'Hockey', description: 'Partidos de hockey de varias ligas' }
    ];
    
    logger.info('Creando deportes...');
    const createdSports = [];
    for (const sport of sports) {
      const [sportRecord] = await Sport.findOrCreate({
        where: { name: sport.name },
        defaults: sport
      });
      createdSports.push(sportRecord);
    }
    
    // 4. Crear ligas para cada deporte
    const leagues = [
      { sport: 'Fútbol', name: 'Premier League', country: 'Inglaterra' },
      { sport: 'Fútbol', name: 'La Liga', country: 'España' },
      { sport: 'Fútbol', name: 'Serie A', country: 'Italia' },
      { sport: 'Fútbol', name: 'Bundesliga', country: 'Alemania' },
      { sport: 'Baloncesto', name: 'NBA', country: 'USA' },
      { sport: 'Baloncesto', name: 'EuroLeague', country: 'Europa' },
      { sport: 'Tenis', name: 'ATP Tour', country: 'Internacional' },
      { sport: 'Tenis', name: 'WTA Tour', country: 'Internacional' },
      { sport: 'Béisbol', name: 'MLB', country: 'USA' },
      { sport: 'Hockey', name: 'NHL', country: 'USA/Canadá' }
    ];
    
    logger.info('Creando ligas...');
    for (const league of leagues) {
      const sport = createdSports.find(s => s.name === league.sport);
      if (sport) {
        await League.findOrCreate({
          where: { 
            name: league.name,
            sport_id: sport.sport_id
          },
          defaults: {
            name: league.name,
            country: league.country,
            sport_id: sport.sport_id
          }
        });
      }
    }
    
    // 5. Crear casas de apuestas básicas
    const bookmakers = [
      { name: 'bet365', website_url: 'https://www.bet365.com' },
      { name: 'Betway', website_url: 'https://www.betway.com' },
      { name: '1xBet', website_url: 'https://www.1xbet.com' }
    ];
    
    logger.info('Creando casas de apuestas...');
    for (const bookmaker of bookmakers) {
      await Bookmaker.findOrCreate({
        where: { name: bookmaker.name },
        defaults: bookmaker
      });
    }
    
    // 6. Crear usuario administrador de ejemplo (si no existe)
    logger.info('Creando usuario administrador...');
    
    const adminEmail = 'admin@bettips.com';
    
    const [adminUser, created] = await User.findOrCreate({
      where: { email: adminEmail },
      defaults: {
        email: adminEmail,
        password: await bcrypt.hash('admin123', 10), // Contraseña encriptada
        is_active: true
      }
    });
    
    if (created) {
      // Buscar rol de administrador
      const adminRole = await Role.findOne({ where: { name: 'admin' } });
      
      // Crear perfil para el admin
      await Profile.create({
        user_id: adminUser.user_id,
        first_name: 'Admin',
        last_name: 'System',
        role_id: adminRole.role_id,
        subscription_id: 3 // Suscripción VIP por defecto
      });
      
      logger.info(`Usuario administrador creado: ${adminEmail}`);
    } else {
      logger.info(`Usuario administrador ya existe: ${adminEmail}`);
    }
    
    logger.info('Carga de datos iniciales completada con éxito.');
  } catch (error) {
    logger.error('Error al cargar datos iniciales:', error);
    throw error;
  }
};

// Ejecutar el script si se llama directamente
if (require.main === module) {
  seed()
    .then(() => {
      logger.info('Script de inicialización completado.');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Error en script de inicialización:', error);
      process.exit(1);
    });
}

module.exports = seed;