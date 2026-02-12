/**
 * DHL Subsystem – Mock data (Nov 2025 – Jan 2026)
 * Single source for vendors, vehicles and contract management.
 * Include before page code: <script src="dhl-mock-data.js"></script>
 */
(function (global) {
  'use strict';

  var MOCK_VENDORS = [
    { id: 1, firstName: 'John', lastName: 'Smith', email: 'john.smith@example.com', phone: '+44 7700 900123', dob: '1985-03-15', depot: 'MSE', serviceProvider: 'BA Express', vendorType: '1', paymentModel: '1', startDate: '2025-11-01', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-11-01', dangerousGoodsTrainingDate: '2025-11-05', manualHandlingTrainingDate: '2025-11-10', dhlTrainingNumber: 'DHL-001', criminalRecordDate: '2025-10-20', dbsNumber: 'DBS001234', dvlaCheckDate: '2026-01-15', visaValidity: null, licenceExpiringDate: '2027-08-01', passportExpiringDate: '2028-03-01' },
    { id: 2, firstName: 'Maria', lastName: 'Santos', email: 'maria.santos@example.com', phone: '+44 7700 900456', dob: '1990-07-22', depot: 'LCY', serviceProvider: 'Premier Logistics Ltd', vendorType: '2', paymentModel: '2', startDate: '2025-11-08', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2023-08-01', dangerousGoodsTrainingDate: '2025-10-20', manualHandlingTrainingDate: '2025-10-25', dhlTrainingNumber: 'DHL-002', criminalRecordDate: '2025-10-01', dbsNumber: 'DBS001235', dvlaCheckDate: '2025-10-01', visaValidity: '2026-03-20', licenceExpiringDate: '2026-12-01', passportExpiringDate: '2027-08-01' },
    { id: 3, firstName: 'James', lastName: 'Wilson', email: 'james.wilson@example.com', phone: '+44 7700 900789', dob: '1982-11-08', depot: 'LSE', serviceProvider: 'Swift Haul Solutions', vendorType: '1', paymentModel: '1', startDate: '2025-11-15', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-04-01', dangerousGoodsTrainingDate: '2025-04-05', manualHandlingTrainingDate: '2025-04-01', dhlTrainingNumber: 'DHL-003', criminalRecordDate: '2025-10-15', dbsNumber: 'DBS001236', dvlaCheckDate: '2026-02-01', visaValidity: null, licenceExpiringDate: '2027-08-15', passportExpiringDate: '2028-01-10' },
    { id: 4, firstName: 'Ana', lastName: 'Ferreira', email: 'ana.ferreira@example.com', phone: '+44 7700 901012', dob: '1988-04-30', depot: 'MSE', serviceProvider: 'Metro Freight Partners', vendorType: '2', paymentModel: '2', startDate: '2025-11-20', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-11-01', dangerousGoodsTrainingDate: '2025-11-05', manualHandlingTrainingDate: '2025-11-10', dhlTrainingNumber: 'DHL-004', criminalRecordDate: '2025-10-10', dbsNumber: 'DBS001237', dvlaCheckDate: '2025-09-01', visaValidity: '2026-09-01', licenceExpiringDate: '2026-03-15', passportExpiringDate: '2026-04-10' },
    { id: 5, firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@example.com', phone: '+44 7700 901345', dob: '1979-09-12', depot: 'LCY', serviceProvider: 'Atlas Transport Services', vendorType: '1', paymentModel: '1', startDate: '2025-12-01', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-12-01', dangerousGoodsTrainingDate: '2025-12-05', manualHandlingTrainingDate: '2025-12-10', dhlTrainingNumber: 'DHL-005', criminalRecordDate: '2025-11-20', dbsNumber: 'DBS001238', dvlaCheckDate: '2026-03-15', visaValidity: null, licenceExpiringDate: '2027-03-01', passportExpiringDate: '2028-06-01' },
    { id: 6, firstName: 'Sofia', lastName: 'Rodrigues', email: 'sofia.rodrigues@example.com', phone: '+44 7700 901678', dob: '1992-01-25', depot: 'LSE', serviceProvider: 'Premier Logistics Ltd', vendorType: '2', paymentModel: '1', startDate: '2025-12-05', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2023-09-01', dangerousGoodsTrainingDate: '2025-11-10', manualHandlingTrainingDate: '2025-12-01', dhlTrainingNumber: 'DHL-006', criminalRecordDate: '2025-11-01', dbsNumber: 'DBS001239', dvlaCheckDate: '2026-01-01', visaValidity: '2026-12-01', licenceExpiringDate: '2027-01-10', passportExpiringDate: '2027-04-20' },
    { id: 7, firstName: 'Emma', lastName: 'Thompson', email: 'emma.thompson@example.com', phone: '+44 7700 901999', dob: '1987-05-18', depot: 'LCY', serviceProvider: 'BA Express', vendorType: '1', paymentModel: '1', startDate: '2025-12-10', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-12-01', dangerousGoodsTrainingDate: '2025-12-05', manualHandlingTrainingDate: '2025-12-10', dhlTrainingNumber: 'DHL-007', criminalRecordDate: '2025-11-25', dbsNumber: 'DBS001240', dvlaCheckDate: '2026-04-10', visaValidity: null, licenceExpiringDate: '2027-10-01', passportExpiringDate: '2028-08-01' },
    { id: 8, firstName: 'David', lastName: 'Clark', email: 'david.clark@example.com', phone: '+44 7700 902111', dob: '1980-12-03', depot: 'MSE', serviceProvider: 'Swift Haul Solutions', vendorType: '2', paymentModel: '2', startDate: '2025-12-15', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-12-01', dangerousGoodsTrainingDate: '2025-12-05', manualHandlingTrainingDate: '2025-12-10', dhlTrainingNumber: 'DHL-008', criminalRecordDate: '2025-11-20', dbsNumber: 'DBS001241', dvlaCheckDate: '2026-04-20', visaValidity: '2026-11-01', licenceExpiringDate: '2027-06-01', passportExpiringDate: '2028-02-01' },
    { id: 9, firstName: 'Oliver', lastName: 'Green', email: 'oliver.green@example.com', phone: '+44 7700 902333', dob: '1986-02-14', depot: 'LSE', serviceProvider: 'Metro Freight Partners', vendorType: '1', paymentModel: '1', startDate: '2025-12-20', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-12-15', dangerousGoodsTrainingDate: '2025-12-18', manualHandlingTrainingDate: '2025-12-20', dhlTrainingNumber: 'DHL-009', criminalRecordDate: '2025-12-01', dbsNumber: 'DBS001242', dvlaCheckDate: '2026-05-01', visaValidity: null, licenceExpiringDate: '2027-04-01', passportExpiringDate: '2028-01-15' },
    { id: 10, firstName: 'Isabella', lastName: 'Martinez', email: 'isabella.martinez@example.com', phone: '+44 7700 902555', dob: '1991-06-08', depot: 'LCY', serviceProvider: 'Atlas Transport Services', vendorType: '2', paymentModel: '2', startDate: '2026-01-05', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2026-01-01', dangerousGoodsTrainingDate: '2026-01-03', manualHandlingTrainingDate: '2026-01-05', dhlTrainingNumber: 'DHL-010', criminalRecordDate: '2025-12-20', dbsNumber: 'DBS001243', dvlaCheckDate: '2026-06-01', visaValidity: '2026-08-01', licenceExpiringDate: '2027-07-01', passportExpiringDate: '2028-03-20' },
    { id: 11, firstName: 'Lucas', lastName: 'Lee', email: 'lucas.lee@example.com', phone: '+44 7700 902777', dob: '1984-10-30', depot: 'MSE', serviceProvider: 'BA Express', vendorType: '1', paymentModel: '1', startDate: '2026-01-10', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2026-01-05', dangerousGoodsTrainingDate: '2026-01-08', manualHandlingTrainingDate: '2026-01-10', dhlTrainingNumber: 'DHL-011', criminalRecordDate: '2025-12-28', dbsNumber: 'DBS001244', dvlaCheckDate: '2026-06-15', visaValidity: null, licenceExpiringDate: '2027-09-01', passportExpiringDate: '2028-05-01' },
    { id: 12, firstName: 'Charlotte', lastName: 'Taylor', email: 'charlotte.taylor@example.com', phone: '+44 7700 902999', dob: '1989-03-22', depot: 'LSE', serviceProvider: 'Premier Logistics Ltd', vendorType: '1', paymentModel: '1', startDate: '2026-01-15', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2026-01-10', dangerousGoodsTrainingDate: '2026-01-12', manualHandlingTrainingDate: '2026-01-15', dhlTrainingNumber: 'DHL-012', criminalRecordDate: '2026-01-01', dbsNumber: 'DBS001245', dvlaCheckDate: '2026-07-01', visaValidity: null, licenceExpiringDate: '2027-10-15', passportExpiringDate: '2028-06-10' },
    { id: 13, firstName: 'Henry', lastName: 'White', email: 'henry.white@example.com', phone: '+44 7700 903111', dob: '1978-08-05', depot: 'LCY', serviceProvider: 'Swift Haul Solutions', vendorType: '2', paymentModel: '1', startDate: '2026-01-20', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2024-01-15', dangerousGoodsTrainingDate: '2026-01-18', manualHandlingTrainingDate: '2026-01-20', dhlTrainingNumber: 'DHL-013', criminalRecordDate: '2026-01-05', dbsNumber: 'DBS001246', dvlaCheckDate: '2025-11-01', visaValidity: null, licenceExpiringDate: '2027-02-01', passportExpiringDate: '2028-01-01' },
    { id: 14, firstName: 'Amelia', lastName: 'Harris', email: 'amelia.harris@example.com', phone: '+44 7700 903333', dob: '1993-12-11', depot: 'MSE', serviceProvider: 'Metro Freight Partners', vendorType: '1', paymentModel: '2', startDate: '2026-01-25', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2026-01-20', dangerousGoodsTrainingDate: '2026-01-22', manualHandlingTrainingDate: '2026-01-25', dhlTrainingNumber: 'DHL-014', criminalRecordDate: '2026-01-10', dbsNumber: 'DBS001247', dvlaCheckDate: '2026-07-25', visaValidity: '2026-10-01', licenceExpiringDate: '2027-11-01', passportExpiringDate: '2028-08-15' },
    { id: 15, firstName: 'George', lastName: 'King', email: 'george.king@example.com', phone: '+44 7700 903555', dob: '1981-05-28', depot: 'LSE', serviceProvider: 'Atlas Transport Services', vendorType: '1', paymentModel: '1', startDate: '2026-01-28', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2026-01-25', dangerousGoodsTrainingDate: '2026-01-26', manualHandlingTrainingDate: '2026-01-28', dhlTrainingNumber: 'DHL-015', criminalRecordDate: '2026-01-15', dbsNumber: 'DBS001248', dvlaCheckDate: '2026-08-01', visaValidity: null, licenceExpiringDate: '2027-12-01', passportExpiringDate: '2028-09-01' },
    { id: 16, firstName: 'Rachel', lastName: 'Cooper', email: 'rachel.cooper@example.com', phone: '+44 7700 903777', dob: '1987-04-12', depot: 'MSE', serviceProvider: 'BA Express', vendorType: '1', paymentModel: '1', startDate: '2024-06-15', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2023-02-01', dangerousGoodsTrainingDate: '2024-03-10', manualHandlingTrainingDate: '2023-08-20', dhlTrainingNumber: 'DHL-016', criminalRecordDate: '2025-09-01', dbsNumber: 'DBS001249', dvlaCheckDate: '2025-11-15', visaValidity: null, licenceExpiringDate: '2027-05-01', passportExpiringDate: '2028-04-01' },
    { id: 17, firstName: 'Thomas', lastName: 'Baker', email: 'thomas.baker@example.com', phone: '+44 7700 903999', dob: '1991-11-30', depot: 'LCY', serviceProvider: 'Premier Logistics Ltd', vendorType: '2', paymentModel: '2', startDate: '2025-09-01', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2023-11-15', dangerousGoodsTrainingDate: '2024-01-20', manualHandlingTrainingDate: '2023-12-01', dhlTrainingNumber: 'DHL-017', criminalRecordDate: '2025-08-20', dbsNumber: 'DBS001250', dvlaCheckDate: '2026-02-20', visaValidity: '2026-05-01', licenceExpiringDate: '2027-03-15', passportExpiringDate: '2028-07-01' },
    { id: 18, firstName: 'Victoria', lastName: 'Wright', email: 'victoria.wright@example.com', phone: '+44 7700 904111', dob: '1985-07-08', depot: 'LSE', serviceProvider: 'Swift Haul Solutions', vendorType: '1', paymentModel: '1', startDate: '2024-03-20', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2022-09-01', dangerousGoodsTrainingDate: '2024-04-15', manualHandlingTrainingDate: '2022-10-20', dhlTrainingNumber: 'DHL-018', criminalRecordDate: '2025-10-01', dbsNumber: 'DBS001251', dvlaCheckDate: '2026-01-10', visaValidity: null, licenceExpiringDate: '2027-07-01', passportExpiringDate: '2028-11-01' },
    { id: 19, firstName: 'Daniel', lastName: 'Mitchell', email: 'daniel.mitchell@example.com', phone: '+44 7700 904333', dob: '1983-02-25', depot: 'MSE', serviceProvider: 'Metro Freight Partners', vendorType: '1', paymentModel: '2', startDate: '2025-07-10', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2024-05-01', dangerousGoodsTrainingDate: '2024-06-15', manualHandlingTrainingDate: '2024-05-20', dhlTrainingNumber: 'DHL-019', criminalRecordDate: '2025-07-15', dbsNumber: 'DBS001252', dvlaCheckDate: '2026-03-01', visaValidity: null, licenceExpiringDate: '2027-09-15', passportExpiringDate: '2028-12-01' },
    { id: 20, firstName: 'Emily', lastName: 'Roberts', email: 'emily.roberts@example.com', phone: '+44 7700 904555', dob: '1989-09-18', depot: 'LCY', serviceProvider: 'Atlas Transport Services', vendorType: '2', paymentModel: '1', startDate: '2025-10-05', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2023-04-10', dangerousGoodsTrainingDate: '2023-06-01', manualHandlingTrainingDate: '2023-05-15', dhlTrainingNumber: 'DHL-020', criminalRecordDate: '2025-09-20', dbsNumber: 'DBS001253', dvlaCheckDate: '2026-04-15', visaValidity: '2026-07-01', licenceExpiringDate: '2027-11-01', passportExpiringDate: '2028-02-15' },
    { id: 21, firstName: 'Christopher', lastName: 'Phillips', email: 'christopher.phillips@example.com', phone: '+44 7700 904777', dob: '1976-12-05', depot: 'LSE', serviceProvider: 'BA Express', vendorType: '1', paymentModel: '1', startDate: '2023-01-15', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2022-06-01', dangerousGoodsTrainingDate: '2022-08-15', manualHandlingTrainingDate: '2022-07-01', dhlTrainingNumber: 'DHL-021', criminalRecordDate: '2025-08-01', dbsNumber: 'DBS001254', dvlaCheckDate: '2025-12-01', visaValidity: null, licenceExpiringDate: '2027-01-01', passportExpiringDate: '2028-06-15' },
    { id: 22, firstName: 'Jessica', lastName: 'Campbell', email: 'jessica.campbell@example.com', phone: '+44 7700 904999', dob: '1994-05-22', depot: 'MSE', serviceProvider: 'Premier Logistics Ltd', vendorType: '1', paymentModel: '1', startDate: '2025-12-01', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-11-15', dangerousGoodsTrainingDate: '2025-12-01', manualHandlingTrainingDate: '2025-11-20', dhlTrainingNumber: 'DHL-022', criminalRecordDate: '2025-11-01', dbsNumber: 'DBS001255', dvlaCheckDate: '2026-05-20', visaValidity: null, licenceExpiringDate: '2028-02-01', passportExpiringDate: '2029-01-01' },
    { id: 23, firstName: 'Matthew', lastName: 'Parker', email: 'matthew.parker@example.com', phone: '+44 7700 905111', dob: '1980-08-14', depot: 'LCY', serviceProvider: 'Swift Haul Solutions', vendorType: '2', paymentModel: '2', startDate: '2024-11-01', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2023-03-20', dangerousGoodsTrainingDate: '2023-05-10', manualHandlingTrainingDate: '2023-04-01', dhlTrainingNumber: 'DHL-023', criminalRecordDate: '2025-10-15', dbsNumber: 'DBS001256', dvlaCheckDate: '2026-06-01', visaValidity: '2026-09-15', licenceExpiringDate: '2027-08-01', passportExpiringDate: '2028-10-01' },
    { id: 24, firstName: 'Sophie', lastName: 'Evans', email: 'sophie.evans@example.com', phone: '+44 7700 905333', dob: '1992-01-08', depot: 'LSE', serviceProvider: 'Metro Freight Partners', vendorType: '1', paymentModel: '1', startDate: '2025-08-20', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2024-02-15', dangerousGoodsTrainingDate: '2024-04-01', manualHandlingTrainingDate: '2024-03-10', dhlTrainingNumber: 'DHL-024', criminalRecordDate: '2025-08-25', dbsNumber: 'DBS001257', dvlaCheckDate: '2026-02-28', visaValidity: null, licenceExpiringDate: '2027-10-01', passportExpiringDate: '2028-04-20' },
    { id: 25, firstName: 'Andrew', lastName: 'Edwards', email: 'andrew.edwards@example.com', phone: '+44 7700 905555', dob: '1988-06-30', depot: 'MSE', serviceProvider: 'Atlas Transport Services', vendorType: '1', paymentModel: '2', startDate: '2024-05-10', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2022-12-01', dangerousGoodsTrainingDate: '2023-01-15', manualHandlingTrainingDate: '2022-12-20', dhlTrainingNumber: 'DHL-025', criminalRecordDate: '2025-09-10', dbsNumber: 'DBS001258', dvlaCheckDate: '2025-11-30', visaValidity: null, licenceExpiringDate: '2027-04-15', passportExpiringDate: '2028-08-01' },
    { id: 26, firstName: 'Nicole', lastName: 'Brooks', email: 'nicole.brooks@example.com', phone: '+44 7700 906001', dob: '1990-04-17', depot: 'LCY', serviceProvider: 'BA Express', vendorType: '1', paymentModel: '1', startDate: '2025-10-12', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-10-01', dangerousGoodsTrainingDate: '2025-10-05', manualHandlingTrainingDate: '2025-10-12', dhlTrainingNumber: 'DHL-026', criminalRecordDate: '2025-09-15', dbsNumber: 'DBS001259', dvlaCheckDate: '2026-02-10', visaValidity: null, licenceExpiringDate: '2027-06-01', passportExpiringDate: '2028-02-01' },
    { id: 27, firstName: 'Peter', lastName: 'Morgan', email: 'peter.morgan@example.com', phone: '+44 7700 906002', dob: '1977-11-23', depot: 'MSE', serviceProvider: 'Premier Logistics Ltd', vendorType: '2', paymentModel: '2', startDate: '2024-02-01', finishDate: '2025-12-31', status: 'Inactive', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2024-01-15', dangerousGoodsTrainingDate: '2024-01-20', manualHandlingTrainingDate: '2024-02-01', dhlTrainingNumber: 'DHL-027', criminalRecordDate: '2024-01-10', dbsNumber: 'DBS001260', dvlaCheckDate: '2025-10-01', visaValidity: null, licenceExpiringDate: '2026-09-01', passportExpiringDate: '2027-03-15' },
    { id: 28, firstName: 'Laura', lastName: 'Bell', email: 'laura.bell@example.com', phone: '+44 7700 906003', dob: '1986-08-09', depot: 'LSE', serviceProvider: 'Swift Haul Solutions', vendorType: '1', paymentModel: '1', startDate: '2026-02-01', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2026-01-25', dangerousGoodsTrainingDate: '2026-01-28', manualHandlingTrainingDate: '2026-02-01', dhlTrainingNumber: 'DHL-028', criminalRecordDate: '2026-01-20', dbsNumber: 'DBS001261', dvlaCheckDate: '2026-08-15', visaValidity: null, licenceExpiringDate: '2028-01-01', passportExpiringDate: '2028-09-10' },
    { id: 29, firstName: 'Ryan', lastName: 'Murphy', email: 'ryan.murphy@example.com', phone: '+44 7700 906004', dob: '1982-01-14', depot: 'LCY', serviceProvider: 'Metro Freight Partners', vendorType: '1', paymentModel: '2', startDate: '2025-08-01', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2024-06-01', dangerousGoodsTrainingDate: '2025-07-20', manualHandlingTrainingDate: '2025-08-01', dhlTrainingNumber: 'DHL-029', criminalRecordDate: '2025-07-01', dbsNumber: 'DBS001262', dvlaCheckDate: '2026-03-20', visaValidity: '2026-11-01', licenceExpiringDate: '2026-05-15', passportExpiringDate: '2027-11-01' },
    { id: 30, firstName: 'Hannah', lastName: 'Ward', email: 'hannah.ward@example.com', phone: '+44 7700 906005', dob: '1994-06-30', depot: 'MSE', serviceProvider: 'Atlas Transport Services', vendorType: '2', paymentModel: '1', startDate: '2025-11-15', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-11-10', dangerousGoodsTrainingDate: '2025-11-12', manualHandlingTrainingDate: '2025-11-15', dhlTrainingNumber: 'DHL-030', criminalRecordDate: '2025-10-25', dbsNumber: 'DBS001263', dvlaCheckDate: '2026-05-01', visaValidity: null, licenceExpiringDate: '2027-07-20', passportExpiringDate: '2028-12-01' },
    { id: 31, firstName: 'Kevin', lastName: 'Richardson', email: 'kevin.richardson@example.com', phone: '+44 7700 906006', dob: '1979-03-08', depot: 'LSE', serviceProvider: 'BA Express', vendorType: '1', paymentModel: '1', startDate: '2023-07-01', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2022-05-01', dangerousGoodsTrainingDate: '2023-06-15', manualHandlingTrainingDate: '2023-07-01', dhlTrainingNumber: 'DHL-031', criminalRecordDate: '2025-06-01', dbsNumber: 'DBS001264', dvlaCheckDate: '2025-09-20', visaValidity: null, licenceExpiringDate: '2026-04-01', passportExpiringDate: '2027-10-15' },
    { id: 32, firstName: 'Zoe', lastName: 'Collins', email: 'zoe.collins@example.com', phone: '+44 7700 906007', dob: '1991-12-19', depot: 'LCY', serviceProvider: 'Premier Logistics Ltd', vendorType: '1', paymentModel: '1', startDate: '2025-12-20', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-12-15', dangerousGoodsTrainingDate: '2025-12-18', manualHandlingTrainingDate: '2025-12-20', dhlTrainingNumber: 'DHL-032', criminalRecordDate: '2025-12-01', dbsNumber: 'DBS001265', dvlaCheckDate: '2026-06-20', visaValidity: '2026-12-15', licenceExpiringDate: '2027-12-01', passportExpiringDate: '2028-07-01' },
    { id: 33, firstName: 'Samuel', lastName: 'Turner', email: 'samuel.turner@example.com', phone: '+44 7700 906008', dob: '1984-05-22', depot: 'MSE', serviceProvider: 'Swift Haul Solutions', vendorType: '2', paymentModel: '2', startDate: '2024-09-15', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2023-11-01', dangerousGoodsTrainingDate: '2024-09-10', manualHandlingTrainingDate: '2024-09-15', dhlTrainingNumber: 'DHL-033', criminalRecordDate: '2024-08-20', dbsNumber: 'DBS001266', dvlaCheckDate: '2026-01-25', visaValidity: null, licenceExpiringDate: '2027-11-15', passportExpiringDate: '2028-05-20' },
    { id: 34, firstName: 'Chloe', lastName: 'Scott', email: 'chloe.scott@example.com', phone: '+44 7700 906009', dob: '1988-09-04', depot: 'LSE', serviceProvider: 'Metro Freight Partners', vendorType: '1', paymentModel: '1', startDate: '2026-01-15', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2026-01-10', dangerousGoodsTrainingDate: '2026-01-12', manualHandlingTrainingDate: '2026-01-15', dhlTrainingNumber: 'DHL-034', criminalRecordDate: '2026-01-05', dbsNumber: 'DBS001267', dvlaCheckDate: '2026-07-10', visaValidity: null, licenceExpiringDate: '2028-02-20', passportExpiringDate: '2028-11-01' },
    { id: 35, firstName: 'Nathan', lastName: 'Young', email: 'nathan.young@example.com', phone: '+44 7700 906010', dob: '1980-07-27', depot: 'LCY', serviceProvider: 'Atlas Transport Services', vendorType: '1', paymentModel: '2', startDate: '2025-06-01', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: false, manualHandlingTraining: true, cargoTrainingDate: '2025-05-15', dangerousGoodsTrainingDate: null, manualHandlingTrainingDate: '2025-06-01', dhlTrainingNumber: 'DHL-035', criminalRecordDate: '2025-05-01', dbsNumber: 'DBS001268', dvlaCheckDate: '2026-02-28', visaValidity: null, licenceExpiringDate: '2026-08-01', passportExpiringDate: '2027-06-15' },
    { id: 36, firstName: 'Megan', lastName: 'Hill', email: 'megan.hill@example.com', phone: '+44 7700 906011', dob: '1993-02-11', depot: 'MSE', serviceProvider: 'BA Express', vendorType: '2', paymentModel: '1', startDate: '2025-09-20', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-09-15', dangerousGoodsTrainingDate: '2025-09-18', manualHandlingTrainingDate: '2025-09-20', dhlTrainingNumber: 'DHL-036', criminalRecordDate: '2025-09-01', dbsNumber: 'DBS001269', dvlaCheckDate: '2026-03-15', visaValidity: null, licenceExpiringDate: '2027-09-20', passportExpiringDate: '2028-04-10' },
    { id: 37, firstName: 'Adam', lastName: 'Green', email: 'adam.green@example.com', phone: '+44 7700 906012', dob: '1985-10-06', depot: 'LSE', serviceProvider: 'Premier Logistics Ltd', vendorType: '1', paymentModel: '1', startDate: '2024-12-01', finishDate: null, status: 'Inactive', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2024-11-15', dangerousGoodsTrainingDate: '2024-11-20', manualHandlingTrainingDate: '2024-12-01', dhlTrainingNumber: 'DHL-037', criminalRecordDate: '2024-11-01', dbsNumber: 'DBS001270', dvlaCheckDate: '2025-08-01', visaValidity: null, licenceExpiringDate: '2026-06-01', passportExpiringDate: '2027-02-28' },
    { id: 38, firstName: 'Grace', lastName: 'Adams', email: 'grace.adams@example.com', phone: '+44 7700 906013', dob: '1992-04-25', depot: 'LCY', serviceProvider: 'Swift Haul Solutions', vendorType: '1', paymentModel: '2', startDate: '2026-02-10', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2026-02-05', dangerousGoodsTrainingDate: '2026-02-08', manualHandlingTrainingDate: '2026-02-10', dhlTrainingNumber: 'DHL-038', criminalRecordDate: '2026-02-01', dbsNumber: 'DBS001271', dvlaCheckDate: '2026-08-20', visaValidity: '2026-10-01', licenceExpiringDate: '2028-03-01', passportExpiringDate: '2028-10-15' },
    { id: 39, firstName: 'Jack', lastName: 'Nelson', email: 'jack.nelson@example.com', phone: '+44 7700 906014', dob: '1987-11-30', depot: 'MSE', serviceProvider: 'Metro Freight Partners', vendorType: '2', paymentModel: '2', startDate: '2025-07-25', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-07-20', dangerousGoodsTrainingDate: '2025-07-22', manualHandlingTrainingDate: '2025-07-25', dhlTrainingNumber: 'DHL-039', criminalRecordDate: '2025-07-10', dbsNumber: 'DBS001272', dvlaCheckDate: '2026-01-15', visaValidity: null, licenceExpiringDate: '2027-05-30', passportExpiringDate: '2028-01-20' },
    { id: 40, firstName: 'Ella', lastName: 'Carter', email: 'ella.carter@example.com', phone: '+44 7700 906015', dob: '1995-01-18', depot: 'LSE', serviceProvider: 'Atlas Transport Services', vendorType: '1', paymentModel: '1', startDate: '2025-10-28', finishDate: null, status: 'Active', cargoTraining: true, dangerousGoodsTraining: true, manualHandlingTraining: true, cargoTrainingDate: '2025-10-25', dangerousGoodsTrainingDate: '2025-10-27', manualHandlingTrainingDate: '2025-10-28', dhlTrainingNumber: 'DHL-040', criminalRecordDate: '2025-10-15', dbsNumber: 'DBS001273', dvlaCheckDate: '2026-04-25', visaValidity: null, licenceExpiringDate: '2027-10-10', passportExpiringDate: '2029-01-05' }
  ];

  var MOCK_VEHICLES = [
    { id: 1, vrn: 'AB12 CDE', vin: 'WVWZZZ3CZWE123456', brand: 'Volkswagen', model: 'Crafter', registrationDate: '2025-11-05', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'BA Express', color: 'White', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: false, doors270: false },
    { id: 2, vrn: 'EF34 FGH', vin: 'WF0XXXTTGXAB12345', brand: 'Ford', model: 'Transit', registrationDate: '2025-11-12', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Premier Logistics Ltd', color: 'Silver', depot: 'LCY', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 3, vrn: 'JK56 LMN', vin: 'VF1RFA00065321098', brand: 'Renault', model: 'Master', registrationDate: '2025-11-18', fuelType: 'Diesel', vehicleType: 'Rigid', serviceProvider: 'Swift Haul Solutions', color: 'Blue', depot: 'LSE', wrappedVehicle: true, slamLock: false, camera: true, gps: true, bulkhead: true, doors270: true },
    { id: 4, vrn: 'OP78 PQR', vin: '7SAYGDEF0NF123456', brand: 'Tesla', model: 'Semi', registrationDate: '2025-11-25', fuelType: 'Electric', vehicleType: 'HGV', serviceProvider: 'Metro Freight Partners', color: 'Red', depot: 'MSE', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 5, vrn: 'ST90 UVW', vin: 'WV2ZZZ70ZSH123456', brand: 'Mercedes-Benz', model: 'Sprinter', registrationDate: '2025-12-02', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Premier Logistics Ltd', color: 'Black', depot: 'LCY', wrappedVehicle: false, slamLock: false, camera: false, gps: true, bulkhead: false, doors270: false },
    { id: 6, vrn: 'XY12 ZAB', vin: 'WF0XXXTTGXCD67890', brand: 'Ford', model: 'e-Transit', registrationDate: '2025-12-10', fuelType: 'Electric', vehicleType: 'Van', serviceProvider: 'Atlas Transport Services', color: 'White', depot: 'LSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: true },
    { id: 7, vrn: 'CD34 EFG', vin: 'WVWZZZ3CZWE789012', brand: 'Volkswagen', model: 'Crafter', registrationDate: '2025-12-15', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'BA Express', color: 'Grey', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 8, vrn: 'GH56 IJK', vin: 'WF0XXXTTGXEF34567', brand: 'Ford', model: 'Transit Custom', registrationDate: '2025-12-20', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Swift Haul Solutions', color: 'Blue', depot: 'LCY', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: false, doors270: false },
    { id: 9, vrn: 'KL78 MNO', vin: 'VF1RFA00065321099', brand: 'Renault', model: 'Trafic', registrationDate: '2025-12-28', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Premier Logistics Ltd', color: 'White', depot: 'LSE', wrappedVehicle: false, slamLock: false, camera: true, gps: true, bulkhead: true, doors270: true },
    { id: 10, vrn: 'PQ90 RST', vin: '7SAYGDEF0NF789012', brand: 'Tesla', model: 'Semi', registrationDate: '2026-01-05', fuelType: 'Electric', vehicleType: 'HGV', serviceProvider: 'Metro Freight Partners', color: 'White', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 11, vrn: 'UV12 WXY', vin: 'WV2ZZZ70ZSH789012', brand: 'Mercedes-Benz', model: 'eVito', registrationDate: '2026-01-12', fuelType: 'Electric', vehicleType: 'Van', serviceProvider: 'Atlas Transport Services', color: 'Silver', depot: 'LCY', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 12, vrn: 'ZA34 BCD', vin: 'WVWZZZ3CZWE345678', brand: 'Volkswagen', model: 'Transporter', registrationDate: '2026-01-18', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'BA Express', color: 'Black', depot: 'LSE', wrappedVehicle: true, slamLock: true, camera: false, gps: true, bulkhead: false, doors270: false },
    { id: 13, vrn: 'EF56 GHI', vin: 'WF0XXXTTGXGH56789', brand: 'Ford', model: 'Transit', registrationDate: '2026-01-25', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Premier Logistics Ltd', color: 'Red', depot: 'MSE', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: true },
    { id: 14, vrn: 'IJ78 KLM', vin: 'VF1RFA00065321100', brand: 'Renault', model: 'Master', registrationDate: '2026-01-30', fuelType: 'Diesel', vehicleType: 'Rigid', serviceProvider: 'Swift Haul Solutions', color: 'Grey', depot: 'LCY', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 15, vrn: 'XX98 OLD', vin: 'WVWZZZ3CZWE001234', brand: 'Volkswagen', model: 'Crafter', registrationDate: '2017-03-15', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'BA Express', color: 'White', depot: 'MSE', wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false },
    { id: 16, vrn: 'YY87 ANO', vin: 'WF0XXXTTGXAB98765', brand: 'Ford', model: 'Transit', registrationDate: '2016-08-22', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Premier Logistics Ltd', color: 'Silver', depot: 'LSE', wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false },
    { id: 17, vrn: 'ZZ76 VET', vin: 'VF1RFA00065320001', brand: 'Renault', model: 'Master', registrationDate: '2015-11-10', fuelType: 'Diesel', vehicleType: 'Rigid', serviceProvider: 'Metro Freight Partners', color: 'Blue', depot: 'LCY', wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false },
    { id: 18, vrn: 'AA11 NEW', vin: 'WVWZZZ3CZWE111111', brand: 'Volkswagen', model: 'Crafter', registrationDate: '2025-10-01', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'BA Express', color: 'White', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 19, vrn: 'BB22 FRESH', vin: 'WF0XXXTTGXBB22222', brand: 'Ford', model: 'Transit', registrationDate: '2025-09-15', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Premier Logistics Ltd', color: 'Silver', depot: 'LCY', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: false, doors270: true },
    { id: 20, vrn: 'CC33 ECO', vin: '7SAYGDEF0NF33333', brand: 'Tesla', model: 'Semi', registrationDate: '2026-02-01', fuelType: 'Electric', vehicleType: 'HGV', serviceProvider: 'Metro Freight Partners', color: 'White', depot: 'LSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 21, vrn: 'DD44 OLD', vin: 'WV2ZZZ70ZSH44444', brand: 'Mercedes-Benz', model: 'Sprinter', registrationDate: '2014-05-20', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Swift Haul Solutions', color: 'Grey', depot: 'MSE', wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false },
    { id: 22, vrn: 'EE55 LEGACY', vin: 'VF1RFA00065355555', brand: 'Renault', model: 'Master', registrationDate: '2013-09-12', fuelType: 'Diesel', vehicleType: 'Rigid', serviceProvider: 'Atlas Transport Services', color: 'White', depot: 'LCY', wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false },
    { id: 23, vrn: 'FF66 TEC', vin: 'WVWZZZ3CZWE66666', brand: 'Volkswagen', model: 'Transporter', registrationDate: '2025-11-20', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'BA Express', color: 'Black', depot: 'LSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: true },
    { id: 24, vrn: 'GG77 FLEET', vin: 'WF0XXXTTGXGG77777', brand: 'Ford', model: 'e-Transit', registrationDate: '2025-12-05', fuelType: 'Electric', vehicleType: 'Van', serviceProvider: 'Premier Logistics Ltd', color: 'Blue', depot: 'MSE', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 25, vrn: 'HH88 AGED', vin: 'VF1RFA00065388888', brand: 'Renault', model: 'Trafic', registrationDate: '2012-03-08', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Metro Freight Partners', color: 'Silver', depot: 'LSE', wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false },
    { id: 26, vrn: 'II99 NEW2', vin: 'WVWZZZ3CZWE99999', brand: 'Volkswagen', model: 'Crafter', registrationDate: '2025-11-01', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'BA Express', color: 'White', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 27, vrn: 'JJ01 PLT', vin: 'WF0XXXTTGXJJ01010', brand: 'Ford', model: 'Transit', registrationDate: '2025-10-15', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Premier Logistics Ltd', color: 'Silver', depot: 'LCY', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: false, doors270: true },
    { id: 28, vrn: 'KK02 SHS', vin: 'VF1RFA00065328028', brand: 'Renault', model: 'Master', registrationDate: '2025-12-01', fuelType: 'Diesel', vehicleType: 'Rigid', serviceProvider: 'Swift Haul Solutions', color: 'Blue', depot: 'LSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 29, vrn: 'LL03 MFP', vin: '7SAYGDEF0NF29029', brand: 'Tesla', model: 'Semi', registrationDate: '2026-01-20', fuelType: 'Electric', vehicleType: 'HGV', serviceProvider: 'Metro Freight Partners', color: 'White', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 30, vrn: 'MM04 ATS', vin: 'WV2ZZZ70ZSH30030', brand: 'Mercedes-Benz', model: 'Sprinter', registrationDate: '2025-09-01', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Atlas Transport Services', color: 'Black', depot: 'LCY', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 31, vrn: 'NN05 CDE', vin: 'WVWZZZ3CZWE31031', brand: 'Volkswagen', model: 'Transporter', registrationDate: '2025-08-20', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'BA Express', color: 'Grey', depot: 'LSE', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: false, doors270: true },
    { id: 32, vrn: 'OO06 FGH', vin: 'WF0XXXTTGXOO32032', brand: 'Ford', model: 'e-Transit', registrationDate: '2026-02-10', fuelType: 'Electric', vehicleType: 'Van', serviceProvider: 'Premier Logistics Ltd', color: 'Blue', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 33, vrn: 'PP07 LMN', vin: 'VF1RFA00065333033', brand: 'Renault', model: 'Trafic', registrationDate: '2025-07-15', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Swift Haul Solutions', color: 'White', depot: 'LCY', wrappedVehicle: false, slamLock: false, camera: true, gps: true, bulkhead: true, doors270: true },
    { id: 34, vrn: 'QQ08 PQR', vin: '7SAYGDEF0NF34034', brand: 'Tesla', model: 'Semi', registrationDate: '2026-03-01', fuelType: 'Electric', vehicleType: 'HGV', serviceProvider: 'Metro Freight Partners', color: 'Red', depot: 'LSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 35, vrn: 'RR09 STU', vin: 'WV2ZZZ70ZSH35035', brand: 'Mercedes-Benz', model: 'eVito', registrationDate: '2025-11-28', fuelType: 'Electric', vehicleType: 'Van', serviceProvider: 'Atlas Transport Services', color: 'Silver', depot: 'MSE', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 36, vrn: 'SS10 VWX', vin: 'WVWZZZ3CZWE36036', brand: 'Volkswagen', model: 'Crafter', registrationDate: '2025-06-10', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'BA Express', color: 'White', depot: 'LCY', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 37, vrn: 'TT11 YZA', vin: 'WF0XXXTTGXTT37037', brand: 'Ford', model: 'Transit Custom', registrationDate: '2025-05-22', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Premier Logistics Ltd', color: 'Grey', depot: 'LSE', wrappedVehicle: false, slamLock: true, camera: true, gps: true, bulkhead: false, doors270: true },
    { id: 38, vrn: 'UU12 BCD', vin: 'VF1RFA00065338038', brand: 'Renault', model: 'Master', registrationDate: '2025-04-18', fuelType: 'Diesel', vehicleType: 'Rigid', serviceProvider: 'Swift Haul Solutions', color: 'Blue', depot: 'MSE', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 39, vrn: 'VV13 EFG', vin: '7SAYGDEF0NF39039', brand: 'Tesla', model: 'Semi', registrationDate: '2026-02-15', fuelType: 'Electric', vehicleType: 'HGV', serviceProvider: 'Metro Freight Partners', color: 'White', depot: 'LCY', wrappedVehicle: true, slamLock: true, camera: true, gps: true, bulkhead: true, doors270: false },
    { id: 40, vrn: 'WW14 HIJ', vin: 'WV2ZZZ70ZSH40040', brand: 'Mercedes-Benz', model: 'Sprinter', registrationDate: '2025-03-05', fuelType: 'Diesel', vehicleType: 'Van', serviceProvider: 'Atlas Transport Services', color: 'Black', depot: 'LSE', wrappedVehicle: false, slamLock: true, camera: false, gps: true, bulkhead: false, doors270: false }
  ];

  /* Bandas digressivas BA SP Rates 2025: cada banda [min, max, price]. max=null = última banda (até +inf).
   * Income = soma por banda: (entregas na banda) × preço; Band 2 = entregas no intervalo Band 2 × preço Band 2, etc. */
  var DIGRESSIVE_BANDS = {
    'LL3': [ { min: 1, max: 503, price: 3.81 }, { min: 504, max: 580, price: 3.43 }, { min: 581, max: 657, price: 3.24 }, { min: 658, max: null, price: 3.05 } ],
    'LL4': [ { min: 1, max: 503, price: 3.81 }, { min: 504, max: 580, price: 3.43 }, { min: 581, max: 657, price: 3.24 }, { min: 658, max: null, price: 3.05 } ],
    'DY1': [ { min: 1, max: 719, price: 3.66 }, { min: 720, max: 781, price: 3.29 }, { min: 782, max: 843, price: 3.11 }, { min: 844, max: null, price: 2.93 } ],
    'DY2': [ { min: 1, max: 719, price: 3.66 }, { min: 720, max: 781, price: 3.29 }, { min: 782, max: 843, price: 3.11 }, { min: 844, max: null, price: 2.93 } ],
    'MD7': [ { min: 1, max: 436, price: 3.38 }, { min: 437, max: 486, price: 3.04 }, { min: 487, max: 536, price: 2.87 }, { min: 537, max: null, price: 2.71 } ]
  };

  /* Estrutura canónica de depots/loops/rotas (Contract Management + Last Day Operation / planilhas).
   * deliveryRate = Band 1 para referência; income real usa bandas digressivas (DIGRESSIVE_BANDS). */
  /* Postcodes por rota para cadastro de subpostcodes (Disco + contratos). Subpostcode = outward code (ex.: ME7, E1, LL3). */
  var ROUTE_POSTCODES = {
    'MSE|MD7A': ['ME7 1AA', 'ME7 2AB', 'ME7 3AC', 'ME8 4AD'],
    'MSE|MD7B': ['ME7 5BA', 'ME7 6BB', 'ME8 7BC'],
    'MSE|MD7C': ['ME7 8CA', 'ME8 9CB', 'ME8 0CC'],
    'MSE|MD7D': ['ME9 1DA', 'ME9 2DB', 'ME9 3DC'],
    'MSE|MD7E': ['ME9 4EA', 'ME9 5EB', 'ME10 6EC'],
    'MSE|MD7X': ['ME7 0XA', 'ME8 0XB', 'ME9 0XC'],
    'LCY|DY1A': ['E1 1AA', 'E1 2AB', 'E2 3AC'],
    'LCY|DY1B': ['E1 4BA', 'E2 5BB', 'E3 6BC'],
    'LCY|DY1C': ['E2 7CA', 'E3 8CB', 'E3 9CC'],
    'LCY|DY1X': ['E1 0XA', 'E2 0XB'],
    'LCY|DY2A': ['E4 1AA', 'E5 2AB', 'E5 3AC'],
    'LCY|DY2B': ['E6 4BA', 'E7 5BB', 'E8 6BC'],
    'LCY|DY2C': ['E9 7CA', 'E10 8CB', 'E11 9CC'],
    'LCY|DY2D': ['E12 1DA', 'E13 2DB', 'E14 3DC'],
    'LCY|DY2X': ['E4 0XA', 'E6 0XB', 'E9 0XC'],
    'LSE|LL3A': ['LL3 1AA', 'LL3 2AB', 'LL3 3AC'],
    'LSE|LL3B': ['LL3 4BA', 'LL3 5BB', 'LL4 6BC'],
    'LSE|LL3C': ['LL3 7CA', 'LL4 8CB'],
    'LSE|LL3D': ['LL4 9DA', 'LL4 0DB', 'LL5 1DC'],
    'LSE|LL3X': ['LL3 0XA', 'LL4 0XB'],
    'LSE|LL4A': ['LL4 2AA', 'LL4 3AB', 'LL5 4AC'],
    'LSE|LL4B': ['LL5 5BA', 'LL5 6BB', 'LL6 7BC'],
    'LSE|LL4X': ['LL4 0XA', 'LL5 0XB']
  };

  var CONTRACT_DEPOTS_STRUCTURE = [
    {
      name: 'MSE',
      loops: [
        { name: 'MD7', deliveryRate: 3.38, routes: [
          { name: 'MD7A', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['MSE|MD7A'] },
          { name: 'MD7B', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['MSE|MD7B'] },
          { name: 'MD7C', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['MSE|MD7C'] },
          { name: 'MD7D', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['MSE|MD7D'] },
          { name: 'MD7E', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['MSE|MD7E'] },
          { name: 'MD7X', type: 'Flex', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['MSE|MD7X'] }
        ]}
      ]
    },
    {
      name: 'LCY',
      loops: [
        { name: 'DY1', deliveryRate: 3.66, routes: [
          { name: 'DY1A', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LCY|DY1A'] },
          { name: 'DY1B', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LCY|DY1B'] },
          { name: 'DY1C', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LCY|DY1C'] },
          { name: 'DY1X', type: 'Flex', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LCY|DY1X'] }
        ]},
        { name: 'DY2', deliveryRate: 3.66, routes: [
          { name: 'DY2A', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LCY|DY2A'] },
          { name: 'DY2B', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LCY|DY2B'] },
          { name: 'DY2C', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LCY|DY2C'] },
          { name: 'DY2D', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LCY|DY2D'] },
          { name: 'DY2X', type: 'Flex', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LCY|DY2X'] }
        ]}
      ]
    },
    {
      name: 'LSE',
      loops: [
        { name: 'LL3', deliveryRate: 3.81, routes: [
          { name: 'LL3A', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LSE|LL3A'] },
          { name: 'LL3B', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LSE|LL3B'] },
          { name: 'LL3C', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LSE|LL3C'] },
          { name: 'LL3D', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LSE|LL3D'] },
          { name: 'LL3X', type: 'Flex', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LSE|LL3X'] }
        ]},
        { name: 'LL4', deliveryRate: 3.81, routes: [
          { name: 'LL4A', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LSE|LL4A'] },
          { name: 'LL4B', type: 'Child', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LSE|LL4B'] },
          { name: 'LL4X', type: 'Flex', targetDel: 80, targetPu: 10, postcodes: ROUTE_POSTCODES['LSE|LL4X'] }
        ]}
      ]
    }
  ];

  /* Clona a estrutura de depots e adiciona deliveries por rota para o dashboard (KPI SPR) – valores determinísticos por rota */
  function hash(s) { var h = 0; for (var i = 0; i < (s || '').length; i++) h = ((h << 5) - h) + s.charCodeAt(i); return h >>> 0; }
  function cloneDepotsAndAddDeliveries(depots) {
    return depots.map(function (d) {
      return {
        name: d.name,
        loops: (d.loops || []).map(function (l) {
          return {
            name: l.name,
            deliveryRate: l.deliveryRate,
            routes: (l.routes || []).map(function (r) {
              var seed = hash(d.name + '|' + l.name + '|' + (r.name || ''));
              var base = (r.postcodes && r.postcodes.length) ? r.postcodes.length * 18 : 72;
              var del = base + (seed % 28);
              return { name: r.name, type: r.type, targetDel: r.targetDel, targetPu: r.targetPu, postcodes: r.postcodes, deliveries: del };
            })
          };
        })
      };
    });
  }
  var MOCK_CONTRACTS = [
    { serviceProvider: 'BA Express', depots: cloneDepotsAndAddDeliveries(CONTRACT_DEPOTS_STRUCTURE) },
    { serviceProvider: 'Premier Logistics Ltd', depots: cloneDepotsAndAddDeliveries(CONTRACT_DEPOTS_STRUCTURE) },
    { serviceProvider: 'Swift Haul Solutions', depots: cloneDepotsAndAddDeliveries(CONTRACT_DEPOTS_STRUCTURE) },
    { serviceProvider: 'Metro Freight Partners', depots: cloneDepotsAndAddDeliveries(CONTRACT_DEPOTS_STRUCTURE) },
    { serviceProvider: 'Atlas Transport Services', depots: cloneDepotsAndAddDeliveries(CONTRACT_DEPOTS_STRUCTURE) }
  ];

  var SERVICE_PROVIDERS = [
    { id: 'ba-express', name: 'BA Express', initials: 'BA', color: '#3b82f6', coverColor: '#1e3a5f', owner: 'Brian Armstrong', email: 'contact@baexpress.com', phone: '+44 20 7123 4501', description: 'BA Express is a premium logistics provider specialising in same-day and next-day delivery across London and the Midlands. Founded in 2010, we focus on reliability and customer satisfaction.', depotManagers: { MSE: { name: 'Sarah Mitchell', email: 'sarah.mitchell@baexpress.com', phone: '+44 7700 123101' }, LCY: { name: 'James Collins', email: 'james.collins@baexpress.com', phone: '+44 7700 123102' }, LSE: { name: 'Emma Watson', email: 'emma.watson@baexpress.com', phone: '+44 7700 123103' } } },
    { id: 'premier-logistics', name: 'Premier Logistics Ltd', initials: 'PL', color: '#1e4976', coverColor: '#0d2847', owner: 'Patricia Logan', email: 'info@premierlogistics.co.uk', phone: '+44 20 7456 7801', description: 'Premier Logistics Ltd has been delivering excellence in freight and last-mile delivery since 2005. We serve major retail and e-commerce clients across London.', depotManagers: { LSE: { name: 'Michael Brown', email: 'michael.brown@premierlogistics.co.uk', phone: '+44 7700 456101' }, LCY: { name: 'David Clark', email: 'david.clark@premierlogistics.co.uk', phone: '+44 7700 456102' } } },
    { id: 'swift-haul', name: 'Swift Haul Solutions', initials: 'SH', color: '#f97316', coverColor: '#2563eb', owner: 'Simon Harper', email: 'hello@swifthaul.co.uk', phone: '+44 20 3890 1201', description: 'Swift Haul Solutions provides agile and responsive logistics services. Our flexible fleet and experienced team ensure on-time deliveries across MSE, LCY and LSE.', depotManagers: { MSE: { name: 'George King', email: 'george.king@swifthaul.co.uk', phone: '+44 7700 789101' }, LCY: { name: 'Emma Thompson', email: 'emma.thompson@swifthaul.co.uk', phone: '+44 7700 789102' }, LSE: { name: 'Amelia Harris', email: 'amelia.harris@swifthaul.co.uk', phone: '+44 7700 789103' } } },
    { id: 'metro-freight', name: 'Metro Freight Partners', initials: 'MF', color: '#2d6a4f', coverColor: '#1b4332', owner: 'Margaret Foster', email: 'contact@metrofreight.co.uk', phone: '+44 20 5678 9012', description: 'Metro Freight Partners specialises in urban logistics and metro-area distribution. We combine local expertise with national reach for efficient last-mile delivery.', depotManagers: { MSE: { name: 'Ana Ferreira', email: 'ana.ferreira@metrofreight.co.uk', phone: '+44 7700 321101' }, LSE: { name: 'James Wilson', email: 'james.wilson@metrofreight.co.uk', phone: '+44 7700 321102' } } },
    { id: 'atlas-transport', name: 'Atlas Transport Services', initials: 'AT', color: '#b91c1c', coverColor: '#7f1d1d', owner: 'Anthony Taylor', email: 'operations@atlastransport.co.uk', phone: '+44 20 2345 6789', description: 'Atlas Transport Services offers comprehensive logistics solutions with a focus on South London and East London depots. Quality and consistency drive our operations.', depotManagers: { LSE: { name: 'Michael Brown', email: 'michael.brown@atlastransport.co.uk', phone: '+44 7700 654101' }, LCY: { name: 'Henry White', email: 'henry.white@atlastransport.co.uk', phone: '+44 7700 654102' } } }
  ];

  /* Last day performance: rotas com SPR, SPOR-H, Time Window, % Target; loops com Time Window % para achievement circles (verde >90%, amarelo 80–90%, vermelho <80%) */
  var LAST_DAY_ROUTES = [];
  var LAST_DAY_LOOPS = [];
  var TW_SAMPLES = [92, 87, 78, 94, 82, 91];
  var twIndex = 0;
  MOCK_CONTRACTS.forEach(function (c) {
    var sp = c.serviceProvider;
    (c.depots || []).forEach(function (d) {
      (d.loops || []).forEach(function (l) {
        var loopName = l.name || d.name;
        if (!LAST_DAY_LOOPS.some(function (x) { return x.loop === loopName && x.serviceProvider === sp; })) {
          var twPct = TW_SAMPLES[twIndex % TW_SAMPLES.length];
          twIndex += 1;
          LAST_DAY_LOOPS.push({ loop: loopName, serviceProvider: sp, timeWindowPct: twPct });
        }
        (l.routes || []).forEach(function (r) {
          LAST_DAY_ROUTES.push({
            route: r.name,
            loop: loopName,
            serviceProvider: sp,
            spr: (90 + Math.floor(Math.random() * 10)).toFixed(1),
            sporh: (10 + (Math.random() * 5)).toFixed(2),
            timeWindow: (82 + Math.floor(Math.random() * 18)).toFixed(1) + '%',
            pctTarget: (88 + Math.floor(Math.random() * 12)).toFixed(0) + '%'
          });
        });
      });
    });
  });

  /* SPMS Overview: Service item só HN (Handover), OK (Deliveries), PU (Pickups) – sem Daily Service/Electric Charge */
  function randomServiceItem() {
    var parts = [];
    var hn = Math.floor(Math.random() * 5);
    if (hn > 0) parts.push(hn + 'xHN - TRFD TO SP');
    var ok = Math.floor(30 + Math.random() * 40);
    parts.push(ok + 'xOK');
    var pu = Math.floor(5 + Math.random() * 25);
    parts.push(pu + 'xPU');
    return parts.join(', ');
  }
  var SPMS_OVERVIEW = [];
  var SPMS_DATES = ['06.02.2026', '05.02.2026', '04.02.2026', '06.02.2026', '06.02.2026', '06.02.2026'];
  MOCK_CONTRACTS.forEach(function (c) {
    var sp = c.serviceProvider;
    (c.depots || []).forEach(function (d) {
      (d.loops || []).forEach(function (l) {
        var loopName = l.name || d.name;
        var routeNames = (l.routes || []).map(function (r) { return r.name; });
        if (routeNames.length === 0) routeNames = ['MD7C', 'MD7A', 'MD7B', 'MD7E', 'MD7X', 'MD7D'];
        routeNames.forEach(function (routeName, idx) {
          SPMS_OVERVIEW.push({
            date: SPMS_DATES[idx % SPMS_DATES.length],
            route: routeName,
            cycle: 'D',
            serviceItem: randomServiceItem(),
            comment: '',
            loop: loopName,
            serviceProvider: sp
          });
        });
      });
    });
  });

  /* Daily operations notifications: routes, deliveries, delays, issues (per SP) */
  var DAILY_OPS_TEMPLATES = [
    { type: 'delay', severity: 'warning', icon: 'clock-history', msg: 'Delivery delay on route {{route}} – estimated {{mins}} min.', route: true },
    { type: 'delivery_done', severity: 'success', icon: 'check-circle', msg: 'Delivery completed – route {{route}}, {{stops}} stops.', route: true },
    { type: 'problem', severity: 'danger', icon: 'exclamation-triangle', msg: 'Issue reported on route {{route}}: {{detail}}.', route: true },
    { type: 'route_change', severity: 'info', icon: 'signpost-2', msg: 'Change to route {{route}} – new time window.', route: true },
    { type: 'vehicle_issue', severity: 'warning', icon: 'truck', msg: 'Vehicle on route {{route}} under review.', route: true },
    { type: 'driver_alert', severity: 'info', icon: 'person', msg: 'Driver on route {{route}} – status update.', route: true }
  ];
  var DAILY_OPERATIONS_NOTIFICATIONS = [];
  var timeAgoPool = [2, 5, 8, 12, 18, 25, 35, 38, 45, 55, 65, 90, 105, 120, 140, 180];
  var detailPool = ['customer not available', 'access code required', 'parcel damaged', 'address correction', 'redelivery scheduled', 'signature obtained', 'left with neighbour'];
  MOCK_CONTRACTS.forEach(function (c) {
    var sp = c.serviceProvider;
    var routes = [];
    (c.depots || []).forEach(function (d) {
      (d.loops || []).forEach(function (l) {
        (l.routes || []).forEach(function (r) {
          if (r.name) routes.push(r.name);
        });
      });
    });
    routes = routes.slice(0, 15);
    /* Primeira volta: todos os templates */
    DAILY_OPS_TEMPLATES.forEach(function (t, i) {
      var route = routes[i % routes.length] || 'R-' + (i + 1);
      var timeAgo = timeAgoPool[(DAILY_OPERATIONS_NOTIFICATIONS.length + i) % timeAgoPool.length];
      var msg = t.msg
        .replace('{{route}}', route)
        .replace('{{mins}}', String(10 + (i % 5) * 8))
        .replace('{{stops}}', String(6 + (i % 8)))
        .replace('{{detail}}', detailPool[i % detailPool.length]);
      DAILY_OPERATIONS_NOTIFICATIONS.push({
        id: 'op-' + sp + '-' + DAILY_OPERATIONS_NOTIFICATIONS.length,
        serviceProvider: sp,
        type: t.type,
        severity: t.severity,
        icon: t.icon,
        message: msg,
        route: route,
        timeAgoMinutes: timeAgo
      });
    });
    /* Segunda volta: mensagens adicionais por SP */
    for (var j = 0; j < 4; j++) {
      var t = DAILY_OPS_TEMPLATES[j % DAILY_OPS_TEMPLATES.length];
      var route = routes[(j + 3) % routes.length];
      var timeAgo = timeAgoPool[(DAILY_OPERATIONS_NOTIFICATIONS.length + j + 5) % timeAgoPool.length];
      var msg = t.msg.replace('{{route}}', route).replace('{{mins}}', String(20 + j * 5)).replace('{{stops}}', String(12 + j)).replace('{{detail}}', detailPool[j % detailPool.length]);
      DAILY_OPERATIONS_NOTIFICATIONS.push({
        id: 'op-' + sp + '-b-' + j,
        serviceProvider: sp,
        type: t.type,
        severity: t.severity,
        icon: t.icon,
        message: msg,
        route: route,
        timeAgoMinutes: timeAgo
      });
    }
  });

  global.DHL_MOCK_DATA = {
    vendors: MOCK_VENDORS,
    vehicles: MOCK_VEHICLES,
    contracts: MOCK_CONTRACTS,
    digressiveBands: DIGRESSIVE_BANDS,
    serviceProviders: SERVICE_PROVIDERS,
    period: { start: '2025-11-01', end: '2026-01-31' },
    dashboardSummary: {
      spr: 94.2,
      timeWindow: 98.5,
      spohR: 12.4,
      totalRequests: 3847,
      activeVendors: 38,
      activeVehicles: 40,
      totalDeliveriesToday: 2156,
      onTimePct: 96.8
    },
    lastDayRoutes: LAST_DAY_ROUTES,
    lastDayLoops: LAST_DAY_LOOPS,
    spmsOverview: SPMS_OVERVIEW,
    dailyOperationsNotifications: DAILY_OPERATIONS_NOTIFICATIONS
  };
})(typeof window !== 'undefined' ? window : this);
