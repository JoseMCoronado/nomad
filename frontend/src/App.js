import React, { Component } from "react";
import Modal from "./components/Modal";
import Navbar from "./components/Navbar/Navbar";
import TransactionSyncDateModal from "./components/TransactionSyncDateModal";
import axios from "axios";
import { withAlert } from 'react-alert';
import { PlaidLink } from 'react-plaid-link';
import 'bootstrap/dist/css/bootstrap.min.css';
import BTable from 'react-bootstrap/Table';
import { useTable, usePagination, useSortBy } from 'react-table';
import CalendarHeatmap from 'react-calendar-heatmap';
import ReactTooltip from 'react-tooltip';
import 'react-calendar-heatmap/dist/styles.css';
import './App.css';
import Button from 'react-bootstrap/Button';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe, faTruckPlane, faHouseCircleCheck, faMugHot, faAnglesRight, faAnglesLeft, faAngleLeft, faAngleRight, faBriefcase, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import "./spinner.css"


function LoadingSpinner() {
  return (
    <div className="spinner-container">
      <div className="loading-spinner">
      </div>
    </div>
  );
};

function Table(props) {
  // Use the state and functions returned from useTable to build your UI
  const columns = props.columns
  const data = props.data
  const defaultPage = props.defaultPage
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page, // Instead of using 'rows', we'll use page,
    // which has only the rows for the active page

    // The rest of these things are super handy, too ;)
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      initialState: {
        pageIndex: parseInt(defaultPage),
        model_name: '',
        action_name: '',
        activeItem: {
          name: "",
        },
        modal: false,
        defaultStay: false
      },
    },
    useSortBy,
    usePagination,
  )


  return (
    <>
      {/* <pre>
        <code>
          {JSON.stringify(
            {
              pageIndex,
              pageSize,
              pageCount,
              canNextPage,
              canPreviousPage,
            },
            null,
            2
          )}
        </code>
      </pre> */}
      <BTable striped bordered hover size="sm" {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>{column.render('Header')}
                  <span>
                    {column.isSorted
                      ? column.isSortedDesc
                        ? ' 🔽'
                        : ' 🔼'
                      : ''}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map((row, i) => {
            prepareRow(row)
            return (
              <tr {...row.getRowProps({
                onClick: e => props.onRowClicked && props.onRowClicked(row, e),
              })}>
                {row.cells.map(cell => {
                  return <td {...cell.getCellProps()} > {cell.render('Cell')}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </BTable>
      {/* 
        Pagination can be built however you'd like. 
        This is just a very basic UI implementation:
      */}
      <div className="pagination">
        <Button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
          <FontAwesomeIcon icon={faAnglesLeft} />
        </Button>{' '}
        <Button onClick={() => previousPage()} disabled={!canPreviousPage}>
          <FontAwesomeIcon icon={faAngleLeft} />
        </Button>{' '}
        <Button onClick={() => nextPage()} disabled={!canNextPage}>
          <FontAwesomeIcon icon={faAngleRight} />
        </Button>{' '}
        <Button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
          <FontAwesomeIcon icon={faAnglesRight} />
        </Button>{' '}
        <span>
          Page{' '}
          <strong>
            {pageIndex + 1} of {pageOptions.length}
          </strong>{' '}
        </span>
        <span>
          | Go to page:{' '}
          <input
            type="number"
            defaultValue={pageIndex + 1}
            onChange={e => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0
              gotoPage(page)
            }}
            style={{ width: '100px' }}
          />
        </span>{' '}
        <select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value))
          }}
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>

      </div>
    </>
  )
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      plaidLinkToken: {},
      viewState: 'pending',
      viewHeatmapState: 'expenses',
      viewHeatmapExpensesState: 'all',
      dateList: [],
      stayList: [],
      categoryList: [],
      expenseList: [],
      expenseItemList: [],
      modal: false,
      transactionSyncDateModal: false,
      plaidSyncLoading: false,
      viewNotebookState: 'daily',
      defaultCity: false,
      defaultStay: false,
      now: new Date().toISOString().split('T')[0],
      model_name: "",
      action_name: "",
      hideSpread: false,
      activeItem: {
        name: "",
      },
    };
  }

  handleOnSuccess(token, metadata) {
    axios
      .post("/tracker/exchange_public_token", { 'public_token': token, 'metadata': metadata })
  }
  handleOnExit() {
  }

  componentDidMount() {
    this.refreshList();
    this.retrievePlaidLinkToken();
  }

  retrievePlaidLinkToken = () => {
    axios
      .post("/tracker/create_link_token", {})
      .then((res) => this.setState({ plaidLinkToken: res.data }))
  };

  refreshList = () => {
    axios
      .get("/tracker/get_dates", { params: { 'viewHeatmapState': this.state.viewHeatmapState, 'viewHeatmapExpensesState': this.state.viewHeatmapExpensesState } })
      .then((res) => this.setState({ dateList: res.data }))
    axios
      .get("/tracker/categories/")
      .then((res) => this.setState({ categoryList: res.data }))
    axios
      .get("/tracker/stays/")
      .then((res) => this.setState({ stayList: res.data }))
    axios
      .get("/tracker/expenses/")
      .then((res) => this.setState({ expenseList: res.data.results }))
    var hidespread = null
    if (this.state.hideSpread) {
      hidespread = true
    }
    axios
      .get("/tracker/items/", { params: { "expense_id__stay_id__isnull": hidespread } })
      .then((res) => this.setState({ expenseItemList: res.data }))
  };

  toggle = () => {
    this.setState({ modal: !this.state.modal, defaultCity: false, defaultStay: false });
  };

  transactionSynceDateToggle = () => {
    this.setState({ transactionSyncDateModal: !this.state.transactionSyncDateModal });
  };

  handleHeatmapClick = (value) => {
    if (value && value.date) {
      this.setState({ now: value.date });
      this.refreshList();
    }
  };

  toggleHideSpread = () => {
    const change_state_promise = new Promise((resolve, reject) => {
      resolve(this.setState({ hideSpread: !this.state.hideSpread }));
      reject("Something went wrong!?");
    });
    change_state_promise.then((value) => {
      this.refreshList()
    });
  }

  handleSubmit = (item) => {
    this.toggle();
    var url = "";
    if (this.state.model_name === 'Expense Category') {
      url = `/tracker/categories/`
    } else if (this.state.model_name === 'Expense') {
      url = `/tracker/expenses/`
    } else {
      url = `/tracker/stays/`
    }
    if (this.state.action_name === 'Edit') {
      url = url + `${item.id}/`
      axios
        .put(url, item)
        .then((res) => this.props.alert.success('Record Updated'))
        .catch((err) => this.props.alert.error(JSON.stringify(err.response.data)))
        .then((res) => this.refreshList());
      return;
    }
    axios
      .post(url, item)
      .then((res) => this.props.alert.success('Record Created'))
      .catch((err) => this.props.alert.error(JSON.stringify(err.response.data)))
      .then((res) => this.refreshList());
  };

  togglePlaidSyncLoading = () => {
    this.setState({ plaidSyncLoading: !this.state.plaidSyncLoading });
  };

  handleTransactionSyncDateSubmit = (item) => {
    const startDate = new Date(item['date_start'])
    const endDate = new Date(item['date_end'])
    const dateError = endDate < startDate
    if (dateError) {
      return alert("Date Error: End date must be after the start date.");
    }
    this.transactionSynceDateToggle();
    this.togglePlaidSyncLoading();
    axios
      .get("/tracker/get_plaid_transaction_at_date", { params: { 'start_date': item['date_start'], 'end_date': item['date_end'] } })
      .then((res) => this.props.alert.info(res.data))
      .catch((err) => this.props.alert.error(JSON.stringify(err.response.data)))
      .then((res) => this.togglePlaidSyncLoading())
      .then((res) => this.refreshList())
  };

  handleDelete = (item) => {
    var url = "";
    if (item.object_type === 'expensecategory') {
      url = `/tracker/categories/${item.id}/`
    } else {
      url = `/tracker/expenses/${item.id}/`
    }
    axios
      .delete(url)
      .then((res) => this.props.alert.info('Record Deleted'))
      .catch((err) => this.props.alert.error(err.response.data.error))
      .then((res) => this.refreshList());
  };

  createCategory = () => {
    const item = { name: "" };

    this.setState({ model_name: 'Expense Category', action_name: 'Create', activeItem: item, modal: !this.state.modal });
  };

  syncExpense = () => {
    this.togglePlaidSyncLoading();
    axios
      .get("/tracker/get_plaid_transaction")
      .then((res) => this.props.alert.info(res.data))
      .catch((err) => this.props.alert.error(JSON.stringify(err.response.data)))
      .then((res) => this.togglePlaidSyncLoading())
      .then((res) => this.refreshList());
  };

  openTransactionSyncDateModal = () => {
    this.setState({ transactionSyncDateModal: !this.state.transactionSyncDateModal });
  };

  createExpense = () => {
    const item = {
      name: "",
      transaction_id: "",
      category_id: this.state.categoryList[0].id,
      date: "",
      amount: 0.00,
      state: "pending"
    };
    this.setState({ model_name: 'Expense', action_name: 'Create', activeItem: item, modal: !this.state.modal });
  };

  createStay = () => {
    const item = {
      name: "",
      date_start: "",
      date_end: "",
      city_id: null,
    };
    this.setState({ model_name: 'Stay', action_name: 'Create', activeItem: item, modal: !this.state.modal });
  };


  editStay = (item) => {
    axios.get("/tracker/cities/" + String(item.city_id)).then((res) => this.setState({ model_name: 'Stay', action_name: 'Edit', activeItem: item, modal: !this.state.modal, defaultCity: res.data }))
  };


  editExpenseCategory = (item) => {
    this.setState({ model_name: 'Expense Category', action_name: 'Edit', activeItem: item, modal: !this.state.modal });
  };

  editExpense = (item) => {
    if (item.stay_id) {
      axios.get("/tracker/stays/" + String(item.stay_id)).then((res) => this.setState({ model_name: 'Expense', action_name: 'Edit', activeItem: item, modal: !this.state.modal, defaultStay: res.data }))
    } else {
      this.setState({ model_name: 'Expense', action_name: 'Edit', activeItem: item, modal: !this.state.modal, defaultStay: false });
    }
  };

  editStayFromTable = (row, e) => {
    const item = this.state.stayList.filter(obj => obj.id === row.original.stayId)[0]
    if (item) {
      axios.get("/tracker/cities/" + String(item.city_id)).then((res) => this.setState({ model_name: 'Stay', action_name: 'Edit', activeItem: item, modal: !this.state.modal, defaultCity: res.data }))
    }
  };

  editExpenseFromTable = (row, e) => {
    const item = this.state.expenseList.filter(obj => obj.id === row.original.expense_id)[0]
    if (item) {
      if (item.stay_id) {
        axios.get("/tracker/stays/" + String(item.stay_id)).then((res) => this.setState({ model_name: 'Expense', action_name: 'Edit', activeItem: item, modal: !this.state.modal, defaultStay: res.data }))
      } else {
        this.setState({ model_name: 'Expense', action_name: 'Edit', activeItem: item, modal: !this.state.modal, defaultStay: false });
      }
    }
  };

  displayState = (status) => {
    const state = status;
    return this.setState({ viewState: state });
  };

  displayNotebookState = (status) => {
    const state = status;
    this.setState({ viewNotebookState: state })
    return
  };

  displayHeatmapState = (status) => {
    const state = status;
    axios
      .get("/tracker/get_dates", { params: { 'viewHeatmapState': state, 'viewHeatmapExpensesState': this.state.viewHeatmapExpensesState } })
      .then((res) => this.setState({ viewHeatmapState: state, dateList: res.data }))
    return
  };

  displayHeatmapExpensesState = (status) => {
    const state = status;
    axios
      .get("/tracker/get_dates", { params: { 'viewHeatmapState': this.state.viewHeatmapState, 'viewHeatmapExpensesState': state } })
      .then((res) => this.setState({ viewHeatmapExpensesState: state, dateList: res.data }))
    return
  };

  renderTabList = () => {
    return (
      <div className="nav nav-tabs">
        <span
          onClick={() => this.displayState('done')}
          className={(this.state.viewState === 'done') ? "nav-link active" : "nav-link"}
        >
          Done
        </span>
        <span
          onClick={() => this.displayState('pending')}
          className={(this.state.viewState === 'pending') ? "nav-link active" : "nav-link"}
        >
          Pending
        </span>
        <span
          onClick={() => this.displayState('ignore')}
          className={(this.state.viewState === 'ignore') ? "nav-link active" : "nav-link"}
        >
          Ignore
        </span>
      </div>
    );
  };

  renderHeatmapOptions = () => {
    return (
      <Tabs
        id="heatmap-options"
        activeKey={this.state.viewHeatmapState}
        onSelect={(k) => this.displayHeatmapState(k)}
        className="mb-3"
      >
        <Tab eventKey="expenses" title="💵 Expenses">

        </Tab>
        <Tab eventKey="booking" title="🛌 Booking">

        </Tab>
        <Tab eventKey="schengen" title="🏰 Schengen">

        </Tab>
      </Tabs>

    );
  };

  renderExpenseOptions = () => {
    var allIcon = <FontAwesomeIcon icon={faGlobe} flip="vertical" />
    var transportIcon = <FontAwesomeIcon icon={faTruckPlane} flip="vertical" />
    var lodgingIcon = <FontAwesomeIcon icon={faHouseCircleCheck} flip="vertical" />
    var businessIcon = <FontAwesomeIcon icon={faBriefcase} flip="vertical" />
    var miscIcon = <FontAwesomeIcon icon={faMugHot} flip="vertical" />
    return (
      <Tabs
        id="heatmap-expense-options"
        activeKey={this.state.viewHeatmapExpensesState}
        onSelect={(k) => this.displayHeatmapExpensesState(k)}
        className="mb-3"
        style={{
          marginTop: "-55px",
          marginLeft: "55px",
          transform: "rotate(180deg)"
        }}
      >
        <Tab eventKey="misc" title={miscIcon} />
        <Tab eventKey="business" title={businessIcon} />
        <Tab eventKey="lodging" title={lodgingIcon} />
        <Tab eventKey="transportation" title={transportIcon} />
        <Tab eventKey="all" title={allIcon} />
      </Tabs>

    );
  };


  renderExpenseCategories = () => {
    const categoryList = this.state.categoryList;

    return categoryList.map((item) => (
      <li
        key={item.id}
        className="list-group-item d-flex justify-content-between align-items-center"
      >
        <span
          className={`todo-title mr-2 ${this.state.viewState ? "completed-todo" : ""
            }`}
          title={item.name}
        >
          {item.name}
        </span>
        <span>
          <button
            className="btn btn-secondary mr-2"
            onClick={() => this.editExpenseCategory(item)}
          >
            Edit
          </button>
          <button
            className="btn btn-danger"
            onClick={() => this.handleDelete(item)}
          >
            Delete
          </button>
        </span>
      </li>
    ));
  };

  renderExpenses = () => {
    const { viewState } = this.state;
    const expenseList = this.state.expenseList.filter(
      (item) => item.state === viewState
    );

    return expenseList.map((item) => (
      <li
        key={item.id}
        className="list-group-item d-flex justify-content-between align-items-center"
      >
        <span
          className={`todo-title mr-2 ${this.state.viewState ? "completed-todo" : ""
            }`}
          title={item.name}
        >
          {item.name}
        </span>
        <span>
          <button
            className="btn btn-secondary mr-2"
            onClick={() => this.editExpense(item)}
          >
            Edit
          </button>
          <button
            className="btn btn-danger"
            onClick={() => this.handleDelete(item)}
          >
            Delete
          </button>
        </span>
      </li>
    ));
  };

  renderStays = () => {
    const stayList = this.state.stayList;

    return stayList.map((item) => (
      <li
        key={item.id}
        className="list-group-item d-flex justify-content-between align-items-center"
      >
        <span
          className={`todo-title mr-2 ${this.state.viewState ? "completed-todo" : ""
            }`}
          title={item.display_name}
        >
          {item.display_name}
        </span>
        <span>
          <button
            className="btn btn-secondary mr-2"
            onClick={() => this.editStay(item)}
          >
            Edit
          </button>
          {/* <button
            className="btn btn-danger"
            onClick={() => this.handleDelete(item)}
          >
            Delete
          </button> */}
        </span>
      </li>
    ));
  };

  componentDidUpdate(prevProps) {
  }


  render() {
    const columns = [
      {
        Header: 'Date',
        accessor: 'date_string',
      },
      {
        Header: 'Label',
        accessor: 'display_name',
      },
      {
        Header: 'Expense ID',
        accessor: 'expense_id',
      },
      {
        Header: 'Classification',
        accessor: 'expense_classification',
      },
      {
        Header: 'Amount',
        accessor: 'amount',
      },
    ];
    var dateColumns = [
      {
        Header: 'Date',
        accessor: 'dateString',
      },
      {
        Header: 'City',
        accessor: 'cityStay',
      },
      // {
      //   Header: 'Schengen Days',
      //   accessor: 'schengenCount',
      // },
      // {
      //   Header: 'Total Amount',
      //   accessor: 'totalAmount',
      // },

    ];

    var defaultDatePage = 0
    var defaultExpensePage = 0
    const dateData = this.state.dateList
    const datePageSize = 10
    if (dateData[0]) {
      var firstDate = new Date(dateData[0].date);
      var dateDiff = Math.ceil(Math.abs(firstDate - new Date(this.state.now)) / (1000 * 60 * 60 * 24));
      defaultDatePage = Math.floor(dateDiff / datePageSize);
    }
    const data = this.state.expenseItemList
    var nowobj = new Date(this.state.now)
    var nowstring = nowobj.toISOString().split('T')[0]
    var index = data.findIndex(object => {
      return object.date === nowstring;
    });
    var tries = 20
    while (index < 0 && tries > 0) {
      tries--;
      nowobj.setDate(nowobj.getDate() - 1)
      index = data.findIndex(object => {
        return object.date === nowobj.toISOString().split('T')[0];
      });
    }
    if (index > 0) {
      defaultExpensePage = Math.floor(index / datePageSize);
    }

    var afterDate = new Date(this.state.now)
    afterDate.setDate(afterDate.getDate() + 180);
    var priorDate = new Date(this.state.now)
    priorDate.setDate(priorDate.getDate() - 180);
    var colorScaleClass = 'expense-budget-'
    if (this.state.viewHeatmapState === 'booking') {
      colorScaleClass = 'color-good-scale-'
      dateColumns.push(
        {
          Header: 'Transport',
          accessor: 'transportMsg',
        },
        {
          Header: 'Lodging',
          accessor: 'lodgingMsg',
        },
      )
    } else if (this.state.viewHeatmapState === 'schengen') {
      colorScaleClass = 'schengen-'
      dateColumns.push(
        {
          Header: 'Schengen Days',
          accessor: 'schengenCount',
        },
      )
    } else if (this.state.viewHeatmapState === 'expenses') {
      dateColumns.push(
        {
          Header: 'Budget',
          accessor: 'budget',
        },
        {
          Header: 'Spend',
          accessor: 'totalAmount',
        },
        {
          Header: 'Difference',
          accessor: 'budgetDiff',
        },
      )
    }

    var heatmapRender = <CalendarHeatmap
      startDate={priorDate}
      endDate={afterDate}
      values={dateData}
      classForValue={value => {
        if (!value) {
          return 'color-void';
        }
        if (value.count === -1) {
          return 'color-selected';
        }
        return `${colorScaleClass}${value.count}`;
      }}
      tooltipDataAttrs={value => {
        return {
          'data-tip': `${value.cityStay}<br/>${value.dateString}<br/>Expenses: ${value.totalAmount}<br/>${value.message}`,
        };
      }}
      showMonthLabels={true}
      showWeekdayLabels={true}
      weekdayLabels={["S", "M", "T", "W", "TH", "F", "S"]}
      horizontal={true}
      onClick={value => {
        this.handleHeatmapClick(value);
      }}
    />
    var heatmapSection = (
      <div className="row" >
        {heatmapRender}
        {this.state.viewHeatmapState === 'expenses' && this.renderExpenseOptions()}
      </div>
    )

    const tableStyle = {
      width: '100%',
    };
    const actionButtonStyle = {
      marginRight: '5px',
    };
    return (
      <main className="container">
        <Navbar />
        {/* <h2 className="text-black my-4">nomad</h2> */}
        <div className="row float-right">
          <div className="col-12 mx-auto p-0 ">
            <PlaidLink
              clientName="Nomad"
              env="development"
              product={["transactions"]}
              token={this.state.plaidLinkToken.link_token}
              onExit={this.handleOnExit}
              onSuccess={this.handleOnSuccess}
              style={{
                padding: 5,
              }}
            >
              🏦 Connect a Bank
            </PlaidLink>
          </div>
        </div >
        {this.renderHeatmapOptions()}
        {heatmapSection}
        <ReactTooltip multiline={true} />

        <Tabs
          id="dashboard-notebook"
          activeKey={this.state.viewNotebookState}
          onSelect={(k) => this.displayNotebookState(k)}
          className="mb-3"
        >
          <Tab eventKey="daily" title="Daily">
            <div className="mx-auto p-0" style={tableStyle}>
              <Table columns={dateColumns} data={dateData} defaultPage={defaultDatePage} onRowClicked={this.editStayFromTable} />
            </div>

          </Tab>
          <Tab eventKey="expenseDetail" title="Expense Detail">
            <div className="mx-auto p-0" style={tableStyle}>
              <Table columns={columns} data={data} defaultPage={defaultExpensePage} onRowClicked={this.editExpenseFromTable} />
              {this.state.hideSpread ?
                <FontAwesomeIcon onClick={this.toggleHideSpread} className="float-right hidespread" icon={faEyeSlash} />
                :
                <FontAwesomeIcon onClick={this.toggleHideSpread} className="float-right hidespread" icon={faEye} />
              }
            </div>
          </Tab>
        </Tabs>
        <div className="row float-right">
          <Button
            className="btn btn-info float-right"
            onClick={this.createStay}
            style={actionButtonStyle}
          >
            Add Stay
          </Button>
          <Button
            className="btn btn-primary float-right me-3"
            onClick={this.createExpense}
            style={actionButtonStyle}
          >
            Create Expenses
          </Button>
          <Button
            className="btn btn-success float-right me-3"
            onClick={this.syncExpense}
            style={actionButtonStyle}
            disabled={this.state.plaidSyncLoading}
          >
            Sync Expenses
          </Button>
          <Button
            className="btn btn-warning float-right me-3"
            onClick={this.openTransactionSyncDateModal}
            style={actionButtonStyle}
            disabled={this.state.plaidSyncLoading}
          >
            Sync Dates
          </Button>
          {this.state.plaidSyncLoading ? <LoadingSpinner /> : null}
        </div>
        {/* <div className="row">

          <div className="mx-auto p-0">
            <div className="card p-3">
              <div className="mb-4">
                <button
                  className="btn btn-primary"
                  onClick={this.createStay}
                >
                  Add Stay
                </button>
              </div>
              <ul className="list-group list-group-flush border-top-0">
                {this.renderStays()}
              </ul>
            </div>
          </div>

          <div className="mx-auto p-0">
            <div className="card p-3">
              <div className="mb-4">
                <button
                  className="btn btn-primary"
                  onClick={this.createCategory}
                >
                  Add Category
                </button>
              </div>
              <ul className="list-group list-group-flush border-top-0">
                {this.renderExpenseCategories()}
              </ul>
            </div>
          </div>

          <div className="mx-auto p-0">
            <div className="card p-3">
              <div className="mb-4">
                <button
                  className="btn btn-primary"
                  onClick={this.createExpense}
                >
                  Add Expense
                </button>
                <button
                  className="btn btn-primary float-right"
                  onClick={this.syncExpense}
                >
                  Sync Expenses
                </button>
              </div>
              {this.renderTabList()}
              <ul className="list-group list-group-flush border-top-0">
                {this.renderExpenses()}
              </ul>
            </div>
          </div>

        </div> */}
        {
          this.state.modal ? (
            <Modal
              activeItem={this.state.activeItem}
              defaultCity={this.state.defaultCity}
              defaultStay={this.state.defaultStay}
              model_name={this.state.model_name}
              action_name={this.state.action_name}
              categoryList={this.state.categoryList}
              stayList={this.state.stayList}
              toggle={this.toggle}
              onSave={this.handleSubmit}
            />
          ) : null
        }
        {
          this.state.transactionSyncDateModal ? (
            <TransactionSyncDateModal
              toggle={this.transactionSynceDateToggle}
              onSave={this.handleTransactionSyncDateSubmit}
            />
          ) : null
        }
      </main >
    );
  }
}

export default withAlert()(App);