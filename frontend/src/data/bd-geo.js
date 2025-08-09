// Minimal Bangladesh administrative data (sample). Expand as needed.
export const BD_GEO = [
  {
    name: 'Dhaka',
    districts: [
      { name: 'Dhaka', upazilas: ['Dhanmondi', 'Gulshan', 'Mirpur', 'Uttara', 'Tejgaon', 'Motijheel', 'Kotwali'] },
      { name: 'Gazipur', upazilas: ['Gazipur Sadar', 'Tongi', 'Kaliakair', 'Sreepur'] },
      { name: 'Narayanganj', upazilas: ['Narayanganj Sadar', 'Sonargaon', 'Rupganj'] },
      { name: 'Manikganj', upazilas: ['Manikganj Sadar', 'Saturia'] },
    ],
  },
  {
    name: 'Chattogram',
    districts: [
      { name: 'Chattogram', upazilas: ['Kotwali', 'Pahartali', 'Panchlaish', 'Halishahar'] },
      { name: "Cox's Bazar", upazilas: ['Cox’s Bazar Sadar', 'Teknaf', 'Ukhiya'] },
      { name: 'Cumilla', upazilas: ['Cumilla Sadar', 'Debidwar', 'Daudkandi'] },
    ],
  },
  {
    name: 'Rajshahi',
    districts: [
      { name: 'Rajshahi', upazilas: ['Rajpara', 'Boalia', 'Motihar', 'Shah Makhdum'] },
      { name: 'Natore', upazilas: ['Natore Sadar', 'Singra'] },
    ],
  },
  {
    name: 'Khulna',
    districts: [
      { name: 'Khulna', upazilas: ['Khulna Sadar', 'Sonadanga', 'Daulatpur'] },
      { name: 'Jessore', upazilas: ['Jessore Sadar', 'Jhikargacha'] },
    ],
  },
  {
    name: 'Barishal',
    districts: [
      { name: 'Barishal', upazilas: ['Barishal Sadar', 'Bakerganj'] },
      { name: 'Bhola', upazilas: ['Bhola Sadar', 'Char Fasson'] },
    ],
  },
  {
    name: 'Sylhet',
    districts: [
      { name: 'Sylhet', upazilas: ['Sylhet Sadar', 'Beanibazar', 'Golapganj'] },
      { name: 'Moulvibazar', upazilas: ['Moulvibazar Sadar', 'Sreemangal'] },
    ],
  },
  {
    name: 'Rangpur',
    districts: [
      { name: 'Rangpur', upazilas: ['Rangpur Sadar', 'Gangachara'] },
      { name: 'Dinajpur', upazilas: ['Dinajpur Sadar', 'Parbatipur'] },
    ],
  },
  {
    name: 'Mymensingh',
    districts: [
      { name: 'Mymensingh', upazilas: ['Mymensingh Sadar', 'Trishal'] },
      { name: 'Jamalpur', upazilas: ['Jamalpur Sadar', 'Melandaha'] },
    ],
  },
];

export const getDivisions = () => BD_GEO.map((d) => d.name);
export const getDistricts = (division) => {
  const d = BD_GEO.find((x) => x.name === division);
  return d ? d.districts.map((x) => x.name) : [];
};
export const getUpazilas = (division, district) => {
  const d = BD_GEO.find((x) => x.name === division);
  if (!d) return [];
  const dist = d.districts.find((x) => x.name === district);
  return dist ? dist.upazilas : [];
};
