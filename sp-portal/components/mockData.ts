/**
 * DHL Subsystem — Mock data (Nov 2025 – Jan 2026)
 * Single source for vendors, vehicles and contract management.
 * Ported from logix-subsistem/dhl-mock-data.js — shared across sp-portal pages.
 */

export interface MockVendor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  depot: string;
  route: string | null;
  serviceProvider: string;
  vendorType: string;
  paymentModel: string;
  startDate: string;
  finishDate: string | null;
  status: string;
  cargoTraining: boolean;
  dangerousGoodsTraining: boolean;
  manualHandlingTraining: boolean;
  cargoTrainingDate: string;
  dangerousGoodsTrainingDate: string;
  manualHandlingTrainingDate: string;
  dhlTrainingNumber: string;
  criminalRecordDate: string;
  dbsNumber: string;
  dvlaCheckDate: string;
  visaValidity: string | null;
  licenceExpiringDate: string;
  passportExpiringDate: string;
}

export const MOCK_VENDORS: MockVendor[] = [
  { id: 1, firstName: 'John', lastName: 'Smith', email: 'john.smith@example.com', phone: '+44 7700 900123', dob: '1985-03-15', depot: 'MSE', route: 'MD7A', serviceProvider: 'TBX', vendorType: '1', paymentModel: '1', startDate: '2025-11-01', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-11-01', dangerousGoodsTrainingDate: '2025-11-05', manualHandlingTrainingDate: '2025-11-10', dhlTrainingNumber: 'DHL-001', criminalRecordDate: '2025-10-20', dbsNumber: 'DBS001234', dvlaCheckDate: '2026-01-15', visaValidity: null, licenceExpiringDate: '2027-08-01', passportExpiringDate: '2028-03-01' },
  { id: 2, firstName: 'Maria', lastName: 'Santos', email: 'maria.santos@example.com', phone: '+44 7700 900456', dob: '1990-07-22', depot: 'MSE', route: 'MD7B', serviceProvider: 'TBX', vendorType: '2', paymentModel: '2', startDate: '2025-11-08', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2023-08-01', dangerousGoodsTrainingDate: '2025-10-20', manualHandlingTrainingDate: '2025-10-25', dhlTrainingNumber: 'DHL-002', criminalRecordDate: '2025-10-01', dbsNumber: 'DBS001235', dvlaCheckDate: '2025-10-01', visaValidity: '2026-03-20', licenceExpiringDate: '2026-12-01', passportExpiringDate: '2027-08-01' },
  { id: 3, firstName: 'James', lastName: 'Wilson', email: 'james.wilson@example.com', phone: '+44 7700 900789', dob: '1982-11-08', depot: 'MSE', route: 'MD7C', serviceProvider: 'TBX', vendorType: '1', paymentModel: '1', startDate: '2025-11-15', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-04-01', dangerousGoodsTrainingDate: '2025-04-05', manualHandlingTrainingDate: '2025-04-01', dhlTrainingNumber: 'DHL-003', criminalRecordDate: '2025-10-15', dbsNumber: 'DBS001236', dvlaCheckDate: '2026-02-01', visaValidity: null, licenceExpiringDate: '2027-08-15', passportExpiringDate: '2028-01-10' },
  { id: 4, firstName: 'Ana', lastName: 'Ferreira', email: 'ana.ferreira@example.com', phone: '+44 7700 901012', dob: '1988-04-30', depot: 'MSE', route: 'MD7D', serviceProvider: 'TBX', vendorType: '2', paymentModel: '2', startDate: '2025-11-20', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-11-01', dangerousGoodsTrainingDate: '2025-11-05', manualHandlingTrainingDate: '2025-11-10', dhlTrainingNumber: 'DHL-004', criminalRecordDate: '2025-10-10', dbsNumber: 'DBS001237', dvlaCheckDate: '2025-09-01', visaValidity: '2026-09-01', licenceExpiringDate: '2026-03-15', passportExpiringDate: '2026-04-10' },
  { id: 5, firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@example.com', phone: '+44 7700 901345', dob: '1979-09-12', depot: 'MSE', route: 'MD7E', serviceProvider: 'TBX', vendorType: '1', paymentModel: '1', startDate: '2025-12-01', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-12-01', dangerousGoodsTrainingDate: '2025-12-05', manualHandlingTrainingDate: '2025-12-10', dhlTrainingNumber: 'DHL-005', criminalRecordDate: '2025-11-20', dbsNumber: 'DBS001238', dvlaCheckDate: '2026-03-15', visaValidity: null, licenceExpiringDate: '2027-03-01', passportExpiringDate: '2028-06-01' },
  { id: 6, firstName: 'Sofia', lastName: 'Rodrigues', email: 'sofia.rodrigues@example.com', phone: '+44 7700 901678', dob: '1992-01-25', depot: 'MSE', route: 'MD7F', serviceProvider: 'TBX', vendorType: '2', paymentModel: '1', startDate: '2025-12-05', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2023-09-01', dangerousGoodsTrainingDate: '2025-11-10', manualHandlingTrainingDate: '2025-12-01', dhlTrainingNumber: 'DHL-006', criminalRecordDate: '2025-11-01', dbsNumber: 'DBS001239', dvlaCheckDate: '2026-01-01', visaValidity: '2026-12-01', licenceExpiringDate: '2027-01-10', passportExpiringDate: '2027-04-20' },
  { id: 7, firstName: 'Emma', lastName: 'Thompson', email: 'emma.thompson@example.com', phone: '+44 7700 901999', dob: '1987-05-18', depot: 'MSE', route: null, serviceProvider: 'TBX', vendorType: '1', paymentModel: '1', startDate: '2025-12-10', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-12-01', dangerousGoodsTrainingDate: '2025-12-05', manualHandlingTrainingDate: '2025-12-10', dhlTrainingNumber: 'DHL-007', criminalRecordDate: '2025-11-25', dbsNumber: 'DBS001240', dvlaCheckDate: '2026-04-10', visaValidity: null, licenceExpiringDate: '2027-10-01', passportExpiringDate: '2028-08-01' },
  { id: 8, firstName: 'David', lastName: 'Clark', email: 'david.clark@example.com', phone: '+44 7700 902111', dob: '1980-12-03', depot: 'MSE', route: null, serviceProvider: 'TBX', vendorType: '2', paymentModel: '2', startDate: '2025-12-15', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-12-01', dangerousGoodsTrainingDate: '2025-12-05', manualHandlingTrainingDate: '2025-12-10', dhlTrainingNumber: 'DHL-008', criminalRecordDate: '2025-11-20', dbsNumber: 'DBS001241', dvlaCheckDate: '2026-04-20', visaValidity: '2026-11-01', licenceExpiringDate: '2027-06-01', passportExpiringDate: '2028-02-01' },
];

export interface MockVehicle {
  id: number;
  vrn: string;
  vin: string;
  brand: string;
  model: string;
  registrationDate: string;
  fuelType: string;
  vehicleType: string;
  serviceProvider: string;
  color: string;
  depot: string;
  wrappedVehicle: boolean;
  slamLock: boolean;
  camera: boolean;
  gps: boolean;
  bulkhead: boolean;
  doors270: boolean;
}

export const MOCK_VEHICLES: MockVehicle[] = [
  { id: 1, vrn: 'AB12 CDE', vin: 'WVWZZZ3CZWE123456', brand: 'Volkswagen', model: 'Crafter', registrationDate: '2025-11-05', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'White', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: false, doors270: false },
  { id: 2, vrn: 'EF34 FGH', vin: 'WF0XXXTTGXAB12345', brand: 'Ford', model: 'Transit', registrationDate: '2025-11-12', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Silver', depot: 'LCY', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 3, vrn: 'JK56 LMN', vin: 'VF1RFA00065321098', brand: 'Renault', model: 'Master', registrationDate: '2025-11-18', fuelType: 'Diesel', vehicleType: 'Rigid', serviceProvider: 'TBX', color: 'Blue', depot: 'LSE', wrappedVehicle: true, slamLock: false, camera: true, gps: true, bulkhead: true, doors270: true },
  { id: 4, vrn: 'OP78 PQR', vin: '7SAYGDEF0NF123456', brand: 'Tesla', model: 'Semi', registrationDate: '2025-11-25', fuelType: 'Electric', vehicleType: 'HGV', serviceProvider: 'TBX', color: 'Red', depot: 'MSE', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 5, vrn: 'ST90 UVW', vin: 'WV2ZZZ70ZSH123456', brand: 'Mercedes-Benz', model: 'Sprinter', registrationDate: '2025-12-02', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Black', depot: 'LCY', wrappedVehicle: false, slamLock: false, camera: false, gps: true, bulkhead: false, doors270: false },
  { id: 6, vrn: 'XY12 ZAB', vin: 'WF0XXXTTGXCD67890', brand: 'Ford', model: 'e-Transit', registrationDate: '2025-12-10', fuelType: 'Electric', vehicleType: 'Van', serviceProvider: 'TBX', color: 'White', depot: 'LSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: true },
  { id: 7, vrn: 'CD34 EFG', vin: 'WVWZZZ3CZWE789012', brand: 'Volkswagen', model: 'Crafter', registrationDate: '2025-12-15', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Grey', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 8, vrn: 'GH56 IJK', vin: 'WF0XXXTTGXEF34567', brand: 'Ford', model: 'Transit Custom', registrationDate: '2025-12-20', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Blue', depot: 'LCY', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: false, doors270: false },
  { id: 9, vrn: 'KL78 MNO', vin: 'VF1RFA00065321099', brand: 'Renault', model: 'Trafic', registrationDate: '2025-12-28', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'White', depot: 'LSE', wrappedVehicle: false, slamLock: false, camera: true, gps: true, bulkhead: true, doors270: true },
  { id: 10, vrn: 'PQ90 RST', vin: '7SAYGDEF0NF789012', brand: 'Tesla', model: 'Semi', registrationDate: '2026-01-05', fuelType: 'Electric', vehicleType: 'HGV', serviceProvider: 'TBX', color: 'White', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 11, vrn: 'UV12 WXY', vin: 'WV2ZZZ70ZSH789012', brand: 'Mercedes-Benz', model: 'eVito', registrationDate: '2026-01-12', fuelType: 'Electric', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Silver', depot: 'LCY', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 12, vrn: 'ZA34 BCD', vin: 'WVWZZZ3CZWE345678', brand: 'Volkswagen', model: 'Transporter', registrationDate: '2026-01-18', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Black', depot: 'LSE', wrappedVehicle: true, slamLock: true, camera: false, gps: true, bulkhead: false, doors270: false },
  { id: 13, vrn: 'EF56 GHI', vin: 'WF0XXXTTGXGH56789', brand: 'Ford', model: 'Transit', registrationDate: '2026-01-25', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Red', depot: 'MSE', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: true },
  { id: 14, vrn: 'IJ78 KLM', vin: 'VF1RFA00065321100', brand: 'Renault', model: 'Master', registrationDate: '2026-01-30', fuelType: 'Diesel', vehicleType: 'Rigid', serviceProvider: 'TBX', color: 'Grey', depot: 'LCY', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 15, vrn: 'XX98 OLD', vin: 'WVWZZZ3CZWE001234', brand: 'Volkswagen', model: 'Crafter', registrationDate: '2017-03-15', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'White', depot: 'MSE', wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false },
  { id: 16, vrn: 'YY87 ANO', vin: 'WF0XXXTTGXAB98765', brand: 'Ford', model: 'Transit', registrationDate: '2016-08-22', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Silver', depot: 'LSE', wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false },
  { id: 17, vrn: 'ZZ76 VET', vin: 'VF1RFA00065320001', brand: 'Renault', model: 'Master', registrationDate: '2015-11-10', fuelType: 'Diesel', vehicleType: 'Rigid', serviceProvider: 'TBX', color: 'Blue', depot: 'LCY', wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false },
  { id: 18, vrn: 'AA11 NEW', vin: 'WVWZZZ3CZWE111111', brand: 'Volkswagen', model: 'Crafter', registrationDate: '2025-10-01', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'White', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 19, vrn: 'BB22 FRESH', vin: 'WF0XXXTTGXBB22222', brand: 'Ford', model: 'Transit', registrationDate: '2025-09-15', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Silver', depot: 'LCY', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: false, doors270: true },
  { id: 20, vrn: 'CC33 ECO', vin: '7SAYGDEF0NF33333', brand: 'Tesla', model: 'Semi', registrationDate: '2026-02-01', fuelType: 'Electric', vehicleType: 'HGV', serviceProvider: 'TBX', color: 'White', depot: 'LSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 21, vrn: 'DD44 OLD', vin: 'WV2ZZZ70ZSH44444', brand: 'Mercedes-Benz', model: 'Sprinter', registrationDate: '2014-05-20', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Grey', depot: 'MSE', wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false },
  { id: 22, vrn: 'EE55 LEGACY', vin: 'VF1RFA00065355555', brand: 'Renault', model: 'Master', registrationDate: '2013-09-12', fuelType: 'Diesel', vehicleType: 'Rigid', serviceProvider: 'TBX', color: 'White', depot: 'LCY', wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false },
  { id: 24, vrn: 'GG77 FLEET', vin: 'WF0XXXTTGXGG77777', brand: 'Ford', model: 'e-Transit', registrationDate: '2025-12-05', fuelType: 'Electric', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Blue', depot: 'MSE', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 25, vrn: 'HH88 AGED', vin: 'VF1RFA00065388888', brand: 'Renault', model: 'Trafic', registrationDate: '2012-03-08', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Silver', depot: 'LSE', wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false },
  { id: 26, vrn: 'II99 NEW2', vin: 'WVWZZZ3CZWE99999', brand: 'Volkswagen', model: 'Crafter', registrationDate: '2025-11-01', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'White', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 27, vrn: 'JJ01 PLT', vin: 'WF0XXXTTGXJJ01010', brand: 'Ford', model: 'Transit', registrationDate: '2025-10-15', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Silver', depot: 'LCY', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: false, doors270: true },
  { id: 28, vrn: 'KK02 SHS', vin: 'VF1RFA00065328028', brand: 'Renault', model: 'Master', registrationDate: '2025-12-01', fuelType: 'Diesel', vehicleType: 'Rigid', serviceProvider: 'TBX', color: 'Blue', depot: 'LSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 29, vrn: 'LL03 MFP', vin: '7SAYGDEF0NF29029', brand: 'Tesla', model: 'Semi', registrationDate: '2026-01-20', fuelType: 'Electric', vehicleType: 'HGV', serviceProvider: 'TBX', color: 'White', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 30, vrn: 'MM04 ATS', vin: 'WV2ZZZ70ZSH30030', brand: 'Mercedes-Benz', model: 'Sprinter', registrationDate: '2025-09-01', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Black', depot: 'LCY', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 31, vrn: 'NN05 CDE', vin: 'WVWZZZ3CZWE31031', brand: 'Volkswagen', model: 'Transporter', registrationDate: '2025-08-20', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Grey', depot: 'LSE', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: false, doors270: true },
  { id: 32, vrn: 'OO06 FGH', vin: 'WF0XXXTTGXOO32032', brand: 'Ford', model: 'e-Transit', registrationDate: '2026-02-10', fuelType: 'Electric', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Blue', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 33, vrn: 'PP07 LMN', vin: 'VF1RFA00065333033', brand: 'Renault', model: 'Trafic', registrationDate: '2025-07-15', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'White', depot: 'LCY', wrappedVehicle: false, slamLock: false, camera: true, gps: true, bulkhead: true, doors270: true },
  { id: 34, vrn: 'QQ08 PQR', vin: '7SAYGDEF0NF34034', brand: 'Tesla', model: 'Semi', registrationDate: '2026-03-01', fuelType: 'Electric', vehicleType: 'HGV', serviceProvider: 'TBX', color: 'Red', depot: 'LSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 35, vrn: 'RR09 STU', vin: 'WV2ZZZ70ZSH35035', brand: 'Mercedes-Benz', model: 'eVito', registrationDate: '2025-11-28', fuelType: 'Electric', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Silver', depot: 'MSE', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 36, vrn: 'SS10 VWX', vin: 'WVWZZZ3CZWE36036', brand: 'Volkswagen', model: 'Crafter', registrationDate: '2025-06-10', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'White', depot: 'LCY', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 37, vrn: 'TT11 YZA', vin: 'WF0XXXTTGXTT37037', brand: 'Ford', model: 'Transit Custom', registrationDate: '2025-05-22', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Grey', depot: 'LSE', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: false, doors270: true },
  { id: 38, vrn: 'UU12 BCD', vin: 'VF1RFA00065338038', brand: 'Renault', model: 'Master', registrationDate: '2025-04-18', fuelType: 'Diesel', vehicleType: 'Rigid', serviceProvider: 'TBX', color: 'Blue', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 39, vrn: 'VV13 EFG', vin: '7SAYGDEF0NF39039', brand: 'Tesla', model: 'Semi', registrationDate: '2026-02-15', fuelType: 'Electric', vehicleType: 'HGV', serviceProvider: 'TBX', color: 'White', depot: 'LCY', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
  { id: 40, vrn: 'WW14 HIJ', vin: 'WV2ZZZ70ZSH40040', brand: 'Mercedes-Benz', model: 'Sprinter', registrationDate: '2025-03-05', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'TBX', color: 'Black', depot: 'LSE', wrappedVehicle: false, slamLock: true, camera: false, gps: true, bulkhead: false, doors270: false },
];

export const DIGRESSIVE_BANDS: Record<string, { min: number; max: number | null; price: number }[]> = {
  MD7: [
    { min: 1, max: 436, price: 3.38 },
    { min: 437, max: 486, price: 3.04 },
    { min: 487, max: 536, price: 2.87 },
    { min: 537, max: null, price: 2.71 },
  ],
};

const ROUTE_POSTCODES: Record<string, string[]> = {
  'MSE|MD7A': ['ME7 1AA', 'ME7 2AB', 'ME7 3AC', 'ME8 4AD'],
  'MSE|MD7B': ['ME7 5BA', 'ME7 6BB', 'ME8 7BC'],
  'MSE|MD7C': ['ME7 8CA', 'ME8 9CB', 'ME8 0CC'],
  'MSE|MD7D': ['ME9 1DA', 'ME9 2DB', 'ME9 3DC'],
  'MSE|MD7E': ['ME9 4EA', 'ME9 5EB', 'ME10 6EC'],
  'MSE|MD7F': ['ME10 7FD', 'ME10 8FE', 'ME10 9FF'],
};

interface RouteStructure {
  name: string;
  type: string;
  targetDel: number;
  targetPu: number;
  postcodes: string[];
}
interface LoopStructure {
  name: string;
  deliveryRate: number;
  routes: RouteStructure[];
}
interface DepotStructure {
  name: string;
  loops: LoopStructure[];
}

const CONTRACT_DEPOTS_STRUCTURE: DepotStructure[] = [
  {
    name: 'MSE',
    loops: [
      {
        name: 'MD7',
        deliveryRate: 3.38,
        routes: [
          { name: 'MD7A', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['MSE|MD7A'] },
          { name: 'MD7B', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['MSE|MD7B'] },
          { name: 'MD7C', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['MSE|MD7C'] },
          { name: 'MD7D', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['MSE|MD7D'] },
          { name: 'MD7E', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['MSE|MD7E'] },
          { name: 'MD7F', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['MSE|MD7F'] },
        ],
      },
    ],
  },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h >>> 0;
}

export interface ContractRoute extends RouteStructure {
  deliveries: number;
}
export interface ContractLoop {
  name: string;
  deliveryRate: number;
  routes: ContractRoute[];
}
export interface ContractDepot {
  name: string;
  loops: ContractLoop[];
}
export interface MockContract {
  serviceProvider: string;
  depots: ContractDepot[];
}

function cloneDepotsAndAddDeliveries(depots: DepotStructure[]): ContractDepot[] {
  return depots.map((d) => ({
    name: d.name,
    loops: (d.loops || []).map((l) => ({
      name: l.name,
      deliveryRate: l.deliveryRate,
      routes: (l.routes || []).map((r) => {
        const seed = hash(d.name + '|' + l.name + '|' + (r.name || ''));
        const base = r.postcodes && r.postcodes.length ? r.postcodes.length * 18 : 72;
        const del = base + (seed % 28);
        return { name: r.name, type: r.type, targetDel: r.targetDel, targetPu: r.targetPu, postcodes: r.postcodes, deliveries: del };
      }),
    })),
  }));
}

export const MOCK_CONTRACTS: MockContract[] = [{ serviceProvider: 'TBX', depots: cloneDepotsAndAddDeliveries(CONTRACT_DEPOTS_STRUCTURE) }];

const LIVE_ROUTE_VOLUME_PLAN = [
  { name: 'MD7A', service: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12', totalVolume: 86, pace: 'ontrack' },
  { name: 'MD7B', service: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12', totalVolume: 92, pace: 'attention' },
  { name: 'MD7C', service: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12', totalVolume: 108, pace: 'delayed' },
  { name: 'MD7D', service: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12', totalVolume: 101, pace: 'complete' },
  { name: 'MD7E', service: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12', totalVolume: 116, pace: 'ontrack' },
  { name: 'MD7F', service: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12', totalVolume: 73, pace: 'attention' },
] as const;

function liveShiftExpectedFraction(): number {
  const now = new Date();
  const start = new Date(now);
  start.setHours(8, 0, 0, 0);
  return Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / (7 * 3600000)));
}

function liveCompletedVolumeFor(total: number, pace: string): number {
  if (pace === 'complete') return total;
  const offset = pace === 'delayed' ? -0.25 : pace === 'attention' ? -0.1 : 0.03;
  const frac = Math.min(1, Math.max(0, liveShiftExpectedFraction() + offset));
  let done = Math.round(total * frac);
  if (done >= total) done = total - 1;
  return Math.max(0, done);
}

const LIVE_ROUTE_POSTCODE_POOL = ['RM 9 9AE', 'RM 4 3QR', 'RM 6 8GD', 'RM 8 0WP', 'RM 8 7HZ', 'RM 9 4XK', 'RM 6 5GY', 'RM 6 8UL', 'RM 7 1TD', 'RM 4 4KL', 'RM 3 4RY', 'RM 3 8ES', 'RM 1 2PD', 'RM 8 6JU', 'RM 3 8XQ', 'RM 3 5PT', 'RM 1 2DE', 'RM 6 2CK', 'RM 6 7CT', 'RM 3 7DB'];
const LIVE_ROUTE_ADDRESS_POOL = ['Market Street', 'Park Lane', 'New Road', 'Bridge Street', 'George Street', 'High Street', 'Manor Road', 'Green Lane', 'Queen Street', 'School Lane', 'Victoria Street', 'Station Road'];

function buildLiveRouteStops(routeName: string, volume: number) {
  const seed = hash(routeName);
  const stops: { pc: string; addr: string }[] = [];
  for (let i = 0; i < volume; i++) {
    stops.push({
      pc: LIVE_ROUTE_POSTCODE_POOL[(seed + i * 3) % LIVE_ROUTE_POSTCODE_POOL.length],
      addr: `${18 + ((seed + i * 17) % 180)} ${LIVE_ROUTE_ADDRESS_POOL[(seed + i) % LIVE_ROUTE_ADDRESS_POOL.length]}`,
    });
  }
  return stops;
}

export const LIVE_ROUTE_DISPATCH = {
  depot: 'MSE',
  serviceProvider: 'TBX',
  updatedAt: '2026-01-31T10:35:00Z',
  routes: LIVE_ROUTE_VOLUME_PLAN.map((route) => ({
    name: route.name,
    service: route.service,
    icon: route.icon,
    tone: route.tone,
    totalVolume: route.totalVolume,
    completedVolume: liveCompletedVolumeFor(route.totalVolume, route.pace),
    stops: buildLiveRouteStops(route.name, route.totalVolume),
  })),
};

export const SERVICE_PROVIDERS = [
  {
    id: 'tbx',
    name: 'TBX',
    initials: 'TBX',
    color: '#3b82f6',
    coverColor: '#1e3a5f',
    owner: 'TBX Operations',
    email: 'operations@tbxlogistics.co.uk',
    phone: '+44 20 7123 4501',
    description: 'TBX is the dedicated Service Provider for this local mock presentation, covering vendor, vehicle, contract and route operations across the DHL network.',
    depotManagers: { MSE: { name: 'Sarah Mitchell', email: 'mse@tbxlogistics.co.uk', phone: '+44 7700 123101' } },
  },
];

export interface LastDayRoute {
  route: string;
  loop: string;
  serviceProvider: string;
  spr: string;
  sporh: string;
  timeWindow: string;
  pctTarget: string;
}
export interface LastDayLoop {
  loop: string;
  serviceProvider: string;
  timeWindowPct: number;
}

const TW_SAMPLES = [92, 87, 78, 94, 82, 91];
let twIndex = 0;
export const LAST_DAY_LOOPS: LastDayLoop[] = [];
export const LAST_DAY_ROUTES: LastDayRoute[] = [];
MOCK_CONTRACTS.forEach((c) => {
  const sp = c.serviceProvider;
  (c.depots || []).forEach((d) => {
    (d.loops || []).forEach((l) => {
      const loopName = l.name || d.name;
      if (!LAST_DAY_LOOPS.some((x) => x.loop === loopName && x.serviceProvider === sp)) {
        const twPct = TW_SAMPLES[twIndex % TW_SAMPLES.length];
        twIndex += 1;
        LAST_DAY_LOOPS.push({ loop: loopName, serviceProvider: sp, timeWindowPct: twPct });
      }
      (l.routes || []).forEach((r) => {
        LAST_DAY_ROUTES.push({
          route: r.name,
          loop: loopName,
          serviceProvider: sp,
          spr: (90 + Math.floor(Math.random() * 10)).toFixed(1),
          sporh: (10 + Math.random() * 5).toFixed(2),
          timeWindow: (82 + Math.floor(Math.random() * 18)).toFixed(1) + '%',
          pctTarget: (88 + Math.floor(Math.random() * 12)).toFixed(0) + '%',
        });
      });
    });
  });
});

function randomServiceItem(): string {
  const parts: string[] = [];
  const hn = Math.floor(Math.random() * 5);
  if (hn > 0) parts.push(hn + 'xHN - TRFD TO SP');
  const ok = Math.floor(30 + Math.random() * 40);
  parts.push(ok + 'xOK');
  const pu = Math.floor(5 + Math.random() * 25);
  parts.push(pu + 'xPU');
  return parts.join(', ');
}

export interface SpmsOverviewEntry {
  date: string;
  route: string;
  cycle: string;
  serviceItem: string;
  comment: string;
  loop: string;
  serviceProvider: string;
}

const SPMS_DATES = ['06.02.2026', '05.02.2026', '04.02.2026', '06.02.2026', '06.02.2026', '06.02.2026'];
export const SPMS_OVERVIEW: SpmsOverviewEntry[] = [];
MOCK_CONTRACTS.forEach((c) => {
  const sp = c.serviceProvider;
  (c.depots || []).forEach((d) => {
    (d.loops || []).forEach((l) => {
      const loopName = l.name || d.name;
      let routeNames = (l.routes || []).map((r) => r.name);
      if (routeNames.length === 0) routeNames = ['MD7C', 'MD7A', 'MD7B', 'MD7E', 'MD7F', 'MD7D'];
      routeNames.forEach((routeName, idx) => {
        SPMS_OVERVIEW.push({
          date: SPMS_DATES[idx % SPMS_DATES.length],
          route: routeName,
          cycle: 'D',
          serviceItem: randomServiceItem(),
          comment: '',
          loop: loopName,
          serviceProvider: sp,
        });
      });
    });
  });
});

interface DailyOpsTemplate {
  type: string;
  severity: string;
  icon: string;
  msg: string;
  route: boolean;
}
const DAILY_OPS_TEMPLATES: DailyOpsTemplate[] = [
  { type: 'delay', severity: 'warning', icon: 'clock-history', msg: 'Delivery delay on route {{route}} – estimated {{mins}} min.', route: true },
  { type: 'delivery_done', severity: 'success', icon: 'check-circle', msg: 'Delivery completed – route {{route}}, {{stops}} stops.', route: true },
  { type: 'problem', severity: 'danger', icon: 'exclamation-triangle', msg: 'Issue reported on route {{route}}: {{detail}}.', route: true },
  { type: 'route_change', severity: 'info', icon: 'signpost-2', msg: 'Change to route {{route}} – new time window.', route: true },
  { type: 'vehicle_issue', severity: 'warning', icon: 'truck', msg: 'Vehicle on route {{route}} under review.', route: true },
  { type: 'driver_alert', severity: 'info', icon: 'person', msg: 'Driver on route {{route}} – status update.', route: true },
  { type: 'alert', severity: 'warning', icon: 'megaphone-fill', msg: 'Alert: {{detail}}.', route: false },
  { type: 'info', severity: 'info', icon: 'info-circle', msg: 'Information update: {{detail}}.', route: false },
  { type: 'network_delay', severity: 'warning', icon: 'wifi', msg: 'Network or delay reported – {{detail}}.', route: false },
];

export interface DailyOpsNotification {
  id: string;
  serviceProvider: string;
  type: string;
  severity: string;
  icon: string;
  message: string;
  route: string;
  timeAgoMinutes: number;
}

const timeAgoPool = [2, 5, 8, 12, 18, 25, 35, 38, 45, 55, 65, 90, 105, 120, 140, 180];
const detailPool = ['customer not available', 'access code required', 'parcel damaged', 'address correction', 'redelivery scheduled', 'signature obtained', 'left with neighbour'];
export const DAILY_OPERATIONS_NOTIFICATIONS: DailyOpsNotification[] = [];
MOCK_CONTRACTS.forEach((c) => {
  const sp = c.serviceProvider;
  let routes: string[] = [];
  (c.depots || []).forEach((d) => {
    (d.loops || []).forEach((l) => {
      (l.routes || []).forEach((r) => {
        if (r.name) routes.push(r.name);
      });
    });
  });
  routes = routes.slice(0, 15);

  DAILY_OPS_TEMPLATES.forEach((t, i) => {
    const route = routes[i % routes.length] || 'R-' + (i + 1);
    const timeAgo = timeAgoPool[(DAILY_OPERATIONS_NOTIFICATIONS.length + i) % timeAgoPool.length];
    const msg = t.msg
      .replace(/\{\{route\}\}/g, route)
      .replace(/\{\{mins\}\}/g, String(10 + (i % 5) * 8))
      .replace(/\{\{stops\}\}/g, String(6 + (i % 8)))
      .replace(/\{\{detail\}\}/g, detailPool[i % detailPool.length]);
    DAILY_OPERATIONS_NOTIFICATIONS.push({
      id: 'op-' + sp + '-' + DAILY_OPERATIONS_NOTIFICATIONS.length,
      serviceProvider: sp,
      type: t.type,
      severity: t.severity,
      icon: t.icon,
      message: msg,
      route,
      timeAgoMinutes: timeAgo,
    });
  });

  for (let j = 0; j < 4; j++) {
    const t = DAILY_OPS_TEMPLATES[j % DAILY_OPS_TEMPLATES.length];
    const route = routes[(j + 3) % routes.length];
    const timeAgo = timeAgoPool[(DAILY_OPERATIONS_NOTIFICATIONS.length + j + 5) % timeAgoPool.length];
    const msg = t.msg.replace('{{route}}', route).replace('{{mins}}', String(20 + j * 5)).replace('{{stops}}', String(12 + j)).replace('{{detail}}', detailPool[j % detailPool.length]);
    DAILY_OPERATIONS_NOTIFICATIONS.push({
      id: 'op-' + sp + '-b-' + j,
      serviceProvider: sp,
      type: t.type,
      severity: t.severity,
      icon: t.icon,
      message: msg,
      route,
      timeAgoMinutes: timeAgo,
    });
  }
});

export interface SopComment {
  author: string;
  company: string;
  authorAvatar: string;
  text: string;
  timeAgo: string;
}
export interface SopPost {
  id: number;
  author: string;
  authorAvatar: string;
  timeAgo: string;
  type: string;
  title: string;
  content: string;
  video: string | null;
  image: string | null;
  youtubeVideoId: string | null;
  likes: number;
  comments: number;
  liked: boolean;
  commentList: SopComment[];
}

export const SOP_POSTS: SopPost[] = [
  { id: 0, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '1 hour ago', type: 'tutorial', title: 'DHL Training Video', content: 'Watch the DHL training video directly on the platform. Stay up to date with procedures and best practices.', video: 'assets/videos/dhl-training-1.mp4', image: null, youtubeVideoId: null, likes: 15, comments: 3, liked: false, commentList: [
    { author: 'James T.', company: 'TBX', authorAvatar: 'assets/dhl-uk-logo.png', text: 'Really clear video, thanks for sharing.', timeAgo: '50 min ago' },
  ] },
  { id: 1, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '2 hours ago', type: 'tutorial', title: 'Safe Loading Procedures – Step by Step', content: 'Updated tutorial for safe loading and unloading of parcels. Key points: secure cargo with straps, check weight distribution, use PPE.', image: 'assets/sop-dhl-truck-london.png', video: null, youtubeVideoId: null, likes: 24, comments: 8, liked: false, commentList: [
    { author: 'Tom W.', company: 'TBX', authorAvatar: 'assets/dhl-uk-logo.png', text: 'Love the photo. Is the strap configuration the same for all vehicle types?', timeAgo: '1 hour ago' },
  ] },
  { id: 2, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '1 day ago', type: 'update', title: 'New Depot Hours – MSE & LCY', content: 'Effective from next Monday, MSE and LCY depots will operate extended hours during peak season.', image: null, video: null, youtubeVideoId: null, likes: 42, comments: 12, liked: false, commentList: [] },
  { id: 3, author: 'DHL Uk', authorAvatar: 'assets/dhl-uk-logo.png', timeAgo: '3 days ago', type: 'info', title: 'Time Window (TW) Compliance Reminder', content: 'Please ensure all deliveries are completed within the agreed time windows.', image: null, video: null, youtubeVideoId: null, likes: 67, comments: 5, liked: true, commentList: [] },
];

export const DASHBOARD_SUMMARY = {
  spr: 94.2,
  timeWindow: 98.5,
  spohR: 12.4,
  totalRequests: 3847,
  activeVendors: 38,
  activeVehicles: 40,
  totalDeliveriesToday: 2156,
  onTimePct: 96.8,
};

export const PERIOD = { start: '2025-11-01', end: '2026-01-31' };

/* ==================== Helpers used across pages ==================== */

const SP_STORAGE_KEY = 'dhl_sp_portal_current_sp';

export function getCurrentSp(searchParams?: URLSearchParams): string {
  if (typeof window === 'undefined') return '';
  const sp = (searchParams?.get('sp') || '').trim();
  if (sp) {
    try {
      sessionStorage.setItem(SP_STORAGE_KEY, sp);
    } catch {
      /* ignore */
    }
    return sp;
  }
  try {
    return sessionStorage.getItem(SP_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function postcodesToSubpostcodes(postcodes: string[] | undefined): string[] {
  if (!postcodes || !postcodes.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const pc of postcodes) {
    const trimmed = String(pc).trim();
    if (trimmed.length <= 2) continue;
    const sub = trimmed.slice(0, -2).trim();
    if (sub && !seen.has(sub)) {
      seen.add(sub);
      out.push(sub);
    }
  }
  return out.sort();
}
