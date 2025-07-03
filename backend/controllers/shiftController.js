const Shift = require('../models/Shift');
const Reservation = require('../models/Reservation');
const Service = require('../models/Service');
const dayjs = require('dayjs');

// Open a new shift for today (if not already opened)
exports.openShift = async (req, res) => {
  try {
    const workerId = req.user.id;
    const todayKey = dayjs().format('YYYY-MM-DD');

    let shift = await Shift.findOne({ worker: workerId, date: todayKey });

    if (shift) {
      if (!shift.closedAt) {
        // already open, refuse
        return res.status(400).json({ message: 'Une journée est déjà ouverte.' });
      }
      // shift exists but was closed earlier – reopen it
      shift.openedAt = new Date();
      shift.closedAt = undefined;
      shift.totalCount = 0;
      shift.totalRevenue = 0;
      await shift.save();
    } else {
      shift = await Shift.create({
        worker: workerId,
        date: todayKey,
        openedAt: new Date(),
      });
    }

    res.status(201).json({ shift });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de l\'ouverture de la journée' });
  }
};

// Close current shift (today) if open
exports.closeShift = async (req, res) => {
  try {
    const workerId = req.user.id;
    const todayKey = dayjs().format('YYYY-MM-DD');
    const shift = await Shift.findOne({ worker: workerId, date: todayKey });
    if (!shift || shift.closedAt) {
      return res.status(400).json({ message: 'Aucune journée ouverte.' });
    }

    // calculate summary
    const reservations = await Reservation.find({
      worker: workerId,
      status: { $in: ['accepted', 'done'] },
      datetime: {
        $gte: new Date(todayKey + 'T00:00:00.000Z'),
        $lte: new Date(todayKey + 'T23:59:59.999Z'),
      },
    }).lean();

    // fetch service prices once
    const services = await Service.find({}).lean();
    const priceMap = {};
    services.forEach((s) => { priceMap[s.name] = s.price; });

    let totalRevenue = 0;
    reservations.forEach((r) => {
      r.services.forEach((s) => {
        totalRevenue += (priceMap[s.name] || 0) * (s.quantity || 1);
      });
    });

    shift.closedAt = new Date();
    shift.totalCount = reservations.length;
    shift.totalRevenue = totalRevenue;
    await shift.save();

    res.json({ shift });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la fermeture de la journée' });
  }
};

// Summary endpoint (returns shift + today reservations)
exports.getSummary = async (req, res) => {
  try {
    const workerId = req.user.id;
    const todayKey = dayjs().format('YYYY-MM-DD');

    const shift = await Shift.findOne({ worker: workerId, date: todayKey });
    const reservations = await Reservation.find({
      worker: workerId,
      datetime: {
        $gte: new Date(todayKey + 'T00:00:00.000Z'),
        $lte: new Date(todayKey + 'T23:59:59.999Z'),
      },
    });

    res.json({ shift, reservations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la récupération du sommaire' });
  }
};
