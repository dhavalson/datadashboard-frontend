export const generatePivotReport = (rawData = [], salesReturnData = [], paymentData = []) => {
  const grouped = {};
  let grandTotalPrimary = 0;
  let grandTotalReturn = 0;
  let grandTotalPayment = 0;

  // 1. Process Primary Sales Data
  rawData.forEach((item) => {
    const zone = (item.zone || 'Unassigned').trim();
    const territory = (item.territory || 'Unassigned').trim();
    const particular = (item.particular || 'Unknown Particular').trim();
    const amount = parseFloat(item.taxable_amt) || 0;

    grandTotalPrimary += amount;

    if (!grouped[zone]) {
      grouped[zone] = { totalPrimary: 0, totalReturn: 0, totalPayment: 0, territories: {} };
    }
    grouped[zone].totalPrimary += amount;

    if (!grouped[zone].territories[territory]) {
      grouped[zone].territories[territory] = { totalPrimary: 0, totalReturn: 0, totalPayment: 0, particulars: {} };
    }
    grouped[zone].territories[territory].totalPrimary += amount;

    if (!grouped[zone].territories[territory].particulars[particular]) {
      grouped[zone].territories[territory].particulars[particular] = { primary: 0, returnAmt: 0, paymentAmt: 0 };
    }
    grouped[zone].territories[territory].particulars[particular].primary += amount;
  });

  // 2. Process Sales Return Data
  salesReturnData.forEach((item) => {
    const zone = (item.zone || 'Unassigned').trim();
    const territory = (item.territory || 'Unassigned').trim();
    const particular = (item.particular || 'Unknown Particular').trim();
    const returnAmount = parseFloat(item.taxable_amt || item.total_amt) || 0;

    grandTotalReturn += returnAmount;

    if (!grouped[zone]) {
      grouped[zone] = { totalPrimary: 0, totalReturn: 0, totalPayment: 0, territories: {} };
    }
    grouped[zone].totalReturn += returnAmount;

    if (!grouped[zone].territories[territory]) {
      grouped[zone].territories[territory] = { totalPrimary: 0, totalReturn: 0, totalPayment: 0, particulars: {} };
    }
    grouped[zone].territories[territory].totalReturn += returnAmount;

    if (!grouped[zone].territories[territory].particulars[particular]) {
      grouped[zone].territories[territory].particulars[particular] = { primary: 0, returnAmt: 0, paymentAmt: 0 };
    }
    grouped[zone].territories[territory].particulars[particular].returnAmt += returnAmount;
  });

  // 3. Process Payment Received Data
  paymentData.forEach((item) => {
    const zone = (item.zone || 'Unassigned').trim();
    const territory = (item.territory || 'Unassigned').trim();
    const particular = (item.particular || item.distributor_name || 'Unknown Particular').trim();
    const paymentAmt = parseFloat(item.amount) || 0;

    grandTotalPayment += paymentAmt;

    if (!grouped[zone]) {
      grouped[zone] = { totalPrimary: 0, totalReturn: 0, totalPayment: 0, territories: {} };
    }
    grouped[zone].totalPayment += paymentAmt;

    if (!grouped[zone].territories[territory]) {
      grouped[zone].territories[territory] = { totalPrimary: 0, totalReturn: 0, totalPayment: 0, particulars: {} };
    }
    grouped[zone].territories[territory].totalPayment += paymentAmt;

    if (!grouped[zone].territories[territory].particulars[particular]) {
      grouped[zone].territories[territory].particulars[particular] = { primary: 0, returnAmt: 0, paymentAmt: 0 };
    }
    grouped[zone].territories[territory].particulars[particular].paymentAmt += paymentAmt;
  });

  const grandTotalNet = grandTotalPrimary - grandTotalReturn;
  const grandTotalBalance = grandTotalNet - grandTotalPayment;

  return {
    zones: grouped,
    grandTotalPrimary,
    grandTotalReturn,
    grandTotalNet,
    grandTotalPayment,
    grandTotalBalance
  };
};