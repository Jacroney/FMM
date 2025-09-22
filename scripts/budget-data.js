// Budget data extracted from Excel
const budgetData = [
  {
    "category_type": "Fixed Costs",
    "category": "IFC",
    "quarter": "Fall",
    "allocated": 4515,
    "spent": 5689.62,
    "remaining": 0
  },
  {
    "category_type": "Fixed Costs",
    "category": "IFC",
    "quarter": "Winter",
    "allocated": 5689.62,
    "spent": 5080.6,
    "remaining": 4181.249999999998
  },
  {
    "category_type": "Fixed Costs",
    "category": "IFC",
    "quarter": "Spring",
    "allocated": 5080.6,
    "spent": 11103.970000000001,
    "remaining": 0
  },
  {
    "category_type": "Fixed Costs",
    "category": "Nationals",
    "quarter": "Fall",
    "allocated": 15778.22,
    "spent": 13361.04,
    "remaining": -2410.71
  },
  {
    "category_type": "Fixed Costs",
    "category": "Nationals",
    "quarter": "Winter",
    "allocated": 10259.85,
    "spent": 5424.41,
    "remaining": -3727.149999999998
  },
  {
    "category_type": "Fixed Costs",
    "category": "Nationals",
    "quarter": "Spring",
    "allocated": 3013.7,
    "spent": 32778.92,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Composite",
    "quarter": "Fall",
    "allocated": 312,
    "spent": 0,
    "remaining": 2895
  },
  {
    "category_type": "Operational Costs",
    "category": "Composite",
    "quarter": "Spring",
    "allocated": 2895,
    "spent": 312,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Damages & Fines",
    "quarter": "Fall",
    "allocated": 2500,
    "spent": 2801.38,
    "remaining": 2776.3599999999997
  },
  {
    "category_type": "Operational Costs",
    "category": "Damages & Fines",
    "quarter": "Winter",
    "allocated": 10350,
    "spent": 2773.6400000000003,
    "remaining": 10224.98
  },
  {
    "category_type": "Operational Costs",
    "category": "Damages & Fines",
    "quarter": "Spring",
    "allocated": 5550,
    "spent": 8175.02,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Families",
    "quarter": "Fall",
    "allocated": 0,
    "spent": 207.57999999999998,
    "remaining": 42.05000000000001
  },
  {
    "category_type": "Operational Costs",
    "category": "Families",
    "quarter": "Winter",
    "allocated": 350,
    "spent": 307.95,
    "remaining": 184.47000000000003
  },
  {
    "category_type": "Operational Costs",
    "category": "Families",
    "quarter": "Spring",
    "allocated": 350,
    "spent": 515.53,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Formal",
    "quarter": "Fall",
    "allocated": 2100,
    "spent": 13000,
    "remaining": 4882.559999999998
  },
  {
    "category_type": "Operational Costs",
    "category": "Formal",
    "quarter": "Winter",
    "allocated": 13000,
    "spent": 10017.440000000002,
    "remaining": 4882.559999999998
  },
  {
    "category_type": "Operational Costs",
    "category": "Formal",
    "quarter": "Spring",
    "allocated": 14900,
    "spent": 25117.440000000002,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Insurance",
    "quarter": "Fall",
    "allocated": 0,
    "spent": 1219.44,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Insurance",
    "quarter": "Winter",
    "allocated": 1500,
    "spent": 0,
    "remaining": 280.55999999999995
  },
  {
    "category_type": "Operational Costs",
    "category": "Insurance",
    "quarter": "Spring",
    "allocated": 0,
    "spent": 1219.44,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Merchandise",
    "quarter": "Fall",
    "allocated": 2233.78,
    "spent": 1480,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Merchandise",
    "quarter": "Winter",
    "allocated": 2533.84,
    "spent": 0,
    "remaining": 3287.620000000001
  },
  {
    "category_type": "Operational Costs",
    "category": "Merchandise",
    "quarter": "Spring",
    "allocated": 0,
    "spent": 1480,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Parents Weekend",
    "quarter": "Fall",
    "allocated": 2000,
    "spent": 3061,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Parents Weekend",
    "quarter": "Winter",
    "allocated": 3000,
    "spent": 0,
    "remaining": 1939
  },
  {
    "category_type": "Operational Costs",
    "category": "Parents Weekend",
    "quarter": "Spring",
    "allocated": 0,
    "spent": 3061,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Pre Game",
    "quarter": "Fall",
    "allocated": 522,
    "spent": 324.65,
    "remaining": 453
  },
  {
    "category_type": "Operational Costs",
    "category": "Pre Game",
    "quarter": "Winter",
    "allocated": 391.5,
    "spent": 302,
    "remaining": 465.8499999999999
  },
  {
    "category_type": "Operational Costs",
    "category": "Pre Game",
    "quarter": "Spring",
    "allocated": 755,
    "spent": 1202.65,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "President",
    "quarter": "Fall",
    "allocated": 1000,
    "spent": 1074.4099999999999,
    "remaining": -3177.4399999999987
  },
  {
    "category_type": "Operational Costs",
    "category": "President",
    "quarter": "Winter",
    "allocated": 1000,
    "spent": 7177.439999999999,
    "remaining": -2845.8499999999985
  },
  {
    "category_type": "Operational Costs",
    "category": "President",
    "quarter": "Spring",
    "allocated": 4000,
    "spent": 8845.849999999999,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Social",
    "quarter": "Fall",
    "allocated": 10667.78,
    "spent": 23168.46,
    "remaining": 7871.529999999999
  },
  {
    "category_type": "Operational Costs",
    "category": "Social",
    "quarter": "Winter",
    "allocated": 32125.34,
    "spent": 20578.47,
    "remaining": 21314.189999999995
  },
  {
    "category_type": "Operational Costs",
    "category": "Social",
    "quarter": "Spring",
    "allocated": 28450,
    "spent": 49928.93000000001,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Sundries",
    "quarter": "Fall",
    "allocated": 3500,
    "spent": 0,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Sundries",
    "quarter": "Spring",
    "allocated": 0,
    "spent": 3874.23,
    "remaining": 0
  },
  {
    "category_type": "Operational Costs",
    "category": "Web",
    "quarter": "Fall",
    "allocated": 8000,
    "spent": 5033.320000000001,
    "remaining": 1625.6500000000005
  },
  {
    "category_type": "Operational Costs",
    "category": "Web",
    "quarter": "Winter",
    "allocated": 6000,
    "spent": 5374.349999999999,
    "remaining": 10507.33
  },
  {
    "category_type": "Operational Costs",
    "category": "Web",
    "quarter": "Spring",
    "allocated": 7000,
    "spent": 10492.67,
    "remaining": 0
  },
  {
    "category_type": "Event Costs",
    "category": "Alumni",
    "quarter": "Fall",
    "allocated": 750,
    "spent": 575.11,
    "remaining": -257.4800000000001
  },
  {
    "category_type": "Event Costs",
    "category": "Alumni",
    "quarter": "Winter",
    "allocated": 700,
    "spent": 457.4800000000001,
    "remaining": -132.59000000000015
  },
  {
    "category_type": "Event Costs",
    "category": "Alumni",
    "quarter": "Spring",
    "allocated": 200,
    "spent": 1782.5900000000001,
    "remaining": 0
  },
  {
    "category_type": "Event Costs",
    "category": "Brotherhood",
    "quarter": "Fall",
    "allocated": 100,
    "spent": 168,
    "remaining": 100
  },
  {
    "category_type": "Event Costs",
    "category": "Brotherhood",
    "quarter": "Winter",
    "allocated": 100,
    "spent": 0,
    "remaining": -316
  },
  {
    "category_type": "Event Costs",
    "category": "Brotherhood",
    "quarter": "Spring",
    "allocated": 100,
    "spent": 616,
    "remaining": 0
  },
  {
    "category_type": "Event Costs",
    "category": "Non Alcoholic Social",
    "quarter": "Fall",
    "allocated": 2000,
    "spent": 1009.8100000000004,
    "remaining": -1.5300000000002
  },
  {
    "category_type": "Event Costs",
    "category": "Non Alcoholic Social",
    "quarter": "Winter",
    "allocated": 3750,
    "spent": 4001.53,
    "remaining": 3097.119999999999
  },
  {
    "category_type": "Event Costs",
    "category": "Non Alcoholic Social",
    "quarter": "Spring",
    "allocated": 4000,
    "spent": 6652.880000000001,
    "remaining": 0
  },
  {
    "category_type": "Event Costs",
    "category": "Philanthropy",
    "quarter": "Fall",
    "allocated": 1500,
    "spent": 0,
    "remaining": 0
  },
  {
    "category_type": "Event Costs",
    "category": "Philanthropy",
    "quarter": "Spring",
    "allocated": 0,
    "spent": 3797.7799999999997,
    "remaining": 0
  },
  {
    "category_type": "Event Costs",
    "category": "Professional",
    "quarter": "Fall",
    "allocated": 100,
    "spent": 0,
    "remaining": 100
  },
  {
    "category_type": "Event Costs",
    "category": "Professional",
    "quarter": "Winter",
    "allocated": 100,
    "spent": 0,
    "remaining": 300
  },
  {
    "category_type": "Event Costs",
    "category": "Professional",
    "quarter": "Spring",
    "allocated": 100,
    "spent": 0,
    "remaining": 0
  },
  {
    "category_type": "Event Costs",
    "category": "Scholarship",
    "quarter": "Fall",
    "allocated": 0,
    "spent": 239.41,
    "remaining": 98.61000000000013
  },
  {
    "category_type": "Event Costs",
    "category": "Scholarship",
    "quarter": "Winter",
    "allocated": 250,
    "spent": 3401.39,
    "remaining": 109.20000000000027
  },
  {
    "category_type": "Event Costs",
    "category": "Scholarship",
    "quarter": "Spring",
    "allocated": 3500,
    "spent": 3640.7999999999997,
    "remaining": 0
  }
];

export default budgetData;