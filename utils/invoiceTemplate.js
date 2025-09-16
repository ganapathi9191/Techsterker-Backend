exports.generateInvoiceHTML = (invoice) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Invoice ${invoice.invoiceId}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      .header { display: flex; justify-content: space-between; align-items: center; }
      .logo { width: 150px; }
      .info { margin-top: 20px; }
      .info h2 { margin: 5px 0; }
      .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .table th { background-color: #f2f2f2; }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="${invoice.logo}" class="logo" />
      <div>
        <h1>${invoice.instituteName}</h1>
        <p>${invoice.instituteAddress}</p>
      </div>
    </div>

    <div class="info">
      <h2>Invoice ID: ${invoice.invoiceId}</h2>
      <p>Name: ${invoice.fullName}</p>
      <p>Email: ${invoice.email}</p>
      <p>Mobile: ${invoice.mobile}</p>
      <p>Status: ${invoice.status}</p>
      <p>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
      <p>Payment Method: ${invoice.paymentMethod}</p>
      <p>Transaction ID: ${invoice.transactionId || "-"}</p>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Type</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.roleType === "student" ? `
          <tr><td>Degree</td><td>${invoice.degree}</td></tr>
          <tr><td>Department</td><td>${invoice.department}</td></tr>
          <tr><td>Year of Passing</td><td>${invoice.yearOfPassing}</td></tr>
        ` : `
          <tr><td>Company</td><td>${invoice.company}</td></tr>
          <tr><td>Role</td><td>${invoice.role}</td></tr>
          <tr><td>Experience</td><td>${invoice.experience}</td></tr>
        `}
      </tbody>
    </table>
  </body>
  </html>
  `;
};