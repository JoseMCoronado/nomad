import React, { Component, useEffect } from "react";
import Select from 'react-select'
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
import {
  Form,
  FormGroup,
  Input,
} from "reactstrap";


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
      planList: [],
      planItemList: [],
      expenseItemListUnfiltered: [],
      modal: false,
      transactionSyncDateModal: false,
      plaidSyncLoading: false,
      viewNotebookState: 'daily',
      defaultCity: false,
      defaultStay: false,
      defaultAvgOption: { value: 'days', label: '# of Days', name: 'defaultAvgOption' },
      includeAvgDailySpendForecast: true,
      avgDays: 30,
      avgManualDailySpend: 0,
      avgStay: null,
      avgStartDate: new Date().toISOString().split('T')[0],
      avgEndDate: new Date().toISOString().split('T')[0],
      budgetStartDate: new Date().toISOString().split('T')[0],
      budgetEndDate: new Date().toISOString().split('T')[0],
      now: new Date().toISOString().split('T')[0],
      model_name: "",
      action_name: "",
      avgDailySpend: 0,
      hideSpread: true,
      hideFx: true,
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

    var dailySpendComputation = 0
    if (!this.state.hideFx) {
      const el = document.getElementById('dailySpendComputation');
      dailySpendComputation = el.getAttribute("value");
    }


    axios
      .get("/tracker/get_dates", { params: { 'viewHeatmapState': this.state.viewHeatmapState, 'viewHeatmapExpensesState': this.state.viewHeatmapExpensesState, 'dailySpendComputation': dailySpendComputation } })
      .then((res) => this.setState({ dateList: res.data, budgetStartDate: res.data[0].date }))
    axios
      .get("/tracker/categories/")
      .then((res) => this.setState({ categoryList: res.data }))
    axios
      .get("/tracker/plan/")
      .then((res) => this.setState({ planList: res.data }))
    axios
      .get("/tracker/planitem/")
      .then((res) => this.setState({ planItemList: res.data }))
    axios
      .get("/tracker/stays/")
      .then((res) => this.setState({ stayList: res.data }))
    axios
      .get("/tracker/expenses/")
      .then((res) => this.setState({ expenseList: res.data.results }))
    var hidespread = null
    var spreadover = null
    if (this.state.hideSpread) {
      hidespread = true
      spreadover = false
    }
    axios
      .get("/tracker/items/", { params: { "expense_id__stay_id__isnull": hidespread, "expense_id__spread_over": spreadover } })
      .then((res) => this.setState({ expenseItemList: res.data }))
    axios
      .get("/tracker/items/")
      .then((res) => this.setState({ expenseItemListUnfiltered: res.data }))
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

  toggleHideFx = () => {
    const change_state_promise = new Promise((resolve, reject) => {
      resolve(this.setState({ hideFx: !this.state.hideFx }));
      reject("Something went wrong!?");
    });
    change_state_promise.then((value) => {
      this.refreshList()
    });
  }

  handleSubmit = (item) => {
    if (item['spead_over']) {
      const startDate = new Date(item['spread_date_start'])
      const endDate = new Date(item['spread_date_end'])
      const dateError = endDate < startDate
      if (dateError) {
        return alert("Date Error: End date must be after the start date.");
      }
    }

    this.toggle();
    var url = "";
    if (this.state.model_name === 'Expense Category') {
      url = `/tracker/categories/`
    } else if (this.state.model_name === 'Expense') {
      url = `/tracker/expenses/`
    } else if (this.state.model_name === 'Plan') {
      url = `/tracker/plan/`
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

  handleModalDelete = (item) => {
    this.toggle();
    var url = "";
    if (this.state.model_name === 'Expense Category') {
      url = `/tracker/categories/`
    } else if (this.state.model_name === 'Expense') {
      url = `/tracker/expenses/`
    } else if (this.state.model_name === 'Plan') {
      url = `/tracker/plan/`
    } else {
      url = `/tracker/stays/`
    }
    url = url + `${item.id}/`
    axios
      .delete(url, item)
      .then((res) => this.props.alert.success('Record Deleted'))
      .catch((err) => this.props.alert.error(JSON.stringify(err.response.data)))
      .then((res) => this.refreshList());
    return;
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

  createPlan = () => {
    const item = {
      name: "",
      date: this.state.now,
      amount: 0.00,
    };
    this.setState({ model_name: 'Plan', action_name: 'Create', activeItem: item, modal: !this.state.modal });
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

  editStayFromDateTable = (row, e) => {
    const item = this.state.stayList.filter(obj => obj.id === row.original.stayId)[0]
    const item_date = new Date(row.original.date).toISOString().split('T')[0]
    if (item) {
      axios.get("/tracker/cities/" + String(item.city_id)).then((res) => this.setState({ now: item_date, model_name: 'Stay', action_name: 'Edit', activeItem: item, modal: !this.state.modal, defaultCity: res.data }))
    }
  };

  editStayFromTable = (row, e) => {
    const item = row.original
    if (item) {
      axios.get("/tracker/cities/" + String(item.city_id)).then((res) => this.setState({ model_name: 'Stay', action_name: 'Edit', activeItem: item, modal: !this.state.modal, defaultCity: res.data }))
    }
  };

  editExpenseFromTable = (row, e) => {
    const item = this.state.expenseList.filter(obj => obj.id === row.original.expense_id)[0]
    const item_date = new Date(item.date).toISOString().split('T')[0]
    if (item) {
      if (item.stay_id) {
        axios.get("/tracker/stays/" + String(item.stay_id)).then((res) => this.setState({ model_name: 'Expense', action_name: 'Edit', activeItem: item, modal: !this.state.modal, defaultStay: res.data }))
      } else {
        this.setState({ now: item_date, model_name: 'Expense', action_name: 'Edit', activeItem: item, modal: !this.state.modal, defaultStay: false });
      }
    }
  };

  editPlanFromTable = (row, e) => {
    const item = row.original
    if (item) {
      if (item.stay_id) {
        axios.get("/tracker/stays/" + String(item.stay_id)).then((res) => this.setState({ model_name: 'Plan', action_name: 'Edit', activeItem: item, modal: !this.state.modal, defaultStay: res.data }))
      } else {
        this.setState({ model_name: 'Plan', action_name: 'Edit', activeItem: item, modal: !this.state.modal, defaultStay: false });
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
      .then((res) => this.setState({ viewHeatmapState: state, dateList: res.data, budgetStartDate: res.data[0].date }))
    return
  };

  displayHeatmapExpensesState = (status) => {
    const state = status;
    axios
      .get("/tracker/get_dates", { params: { 'viewHeatmapState': this.state.viewHeatmapState, 'viewHeatmapExpensesState': state } })
      .then((res) => this.setState({ viewHeatmapExpensesState: state, dateList: res.data, budgetStartDate: res.data[0].date }))
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

  handleKeyMetricChange = (e) => {
    let { name, value } = e.target;
    if (e.target.type === "checkbox") {
      value = e.target.checked;
    }
    this.setState({ [name]: value });
  };

  handleKeyMetricSelectChange = (e) => {
    let { name } = e;
    this.setState({ [name]: e });
  };

  handleStaySelect = (e) => {
    this.setState({ avgStay: e });
  };

  renderKeyMetrics = () => {
    var formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const nonMiscDailyBudget = 166
    const miscDailyBudget = 196
    const totalDailyBudget = miscDailyBudget + nonMiscDailyBudget
    var checkedFxSelection = this.state.includeAvgDailySpendForecast
    var avgStartDate = this.state.avgStartDate
    var avgEndDate = this.state.avgEndDate
    const budgetStartDate = this.state.budgetStartDate
    const budgetEndDate = this.state.budgetEndDate
    const daysForAvgSpend = this.state.avgDays
    const expenseData = this.state.expenseList
    const expenseItemData = this.state.expenseItemListUnfiltered
    const planItemData = this.state.planItemList
    const defaultAvgOption = this.state.defaultAvgOption
    var avgDays = 0
    var avgStay = this.state.avgStay
    if (!avgStay && this.state.stayList.length > 0) {
      avgStay = this.state.stayList[0]
    }
    var showAvgDays = false

    var inputAvgTh = null
    var inputAvgTd = null

    var nowDate = new Date().toISOString().split('T')[0]
    var toDate = null
    var priorDate = null

    if (defaultAvgOption.value === 'days') {
      avgDays = daysForAvgSpend
      toDate = new Date().toISOString().split('T')[0]
      priorDate = new Date()
      priorDate.setDate(priorDate.getDate() - daysForAvgSpend);
      priorDate = priorDate.toISOString().split('T')[0]
      inputAvgTh = (
        <th>Days for Avg. Daily Spend</th>
      )
      inputAvgTd = (
        <td>
          <Form>
            <FormGroup>
              <Input
                type="integer"
                id="avg-days"
                name="avgDays"
                style={{
                  textAlign: "center",
                }}
                value={this.state.avgDays}
                onChange={this.handleKeyMetricChange}
              />
            </FormGroup>
          </Form>
        </td>
      )
    } else if (defaultAvgOption.value === 'setDates') {
      priorDate = avgStartDate
      toDate = avgEndDate
      avgDays = (Math.ceil(Math.abs(new Date(priorDate) - new Date(toDate)) / (1000 * 60 * 60 * 24))) + 1
      showAvgDays = true
      inputAvgTh = (
        <>
          <th>From</th>
          <th>To</th>
        </>
      )
      inputAvgTd = (
        <>
          <td>
            <Form>
              <FormGroup>
                <Input
                  type="date"
                  id="avg-start-Date"
                  name="avgStartDate"
                  style={{
                    textAlign: "center",
                  }}
                  value={avgStartDate}
                  onChange={this.handleKeyMetricChange}
                />
              </FormGroup>
            </Form>
          </td>
          <td>
            <Form>
              <FormGroup>
                <Input
                  type="date"
                  id="avg-end-Date"
                  name="avgEndDate"
                  style={{
                    textAlign: "center",
                  }}
                  value={avgEndDate}
                  onChange={this.handleKeyMetricChange}
                />
              </FormGroup>
            </Form>
          </td>
        </>
      )
    } else if (defaultAvgOption.value === 'manual') {
      toDate = null
      priorDate = null
      avgDays = 0
      inputAvgTh = (
        <th>Daily Spend</th>
      )
      inputAvgTd = (
        <td>
          <Form>
            <FormGroup>
              <Input
                type="float"
                id="avg-manual-spend"
                name="avgManualDailySpend"
                style={{
                  textAlign: "center",
                }}
                value={this.state.avgManualDailySpend}
                onChange={this.handleKeyMetricChange}
              />
            </FormGroup>
          </Form>
        </td>
      )
    } else if (defaultAvgOption.value === 'stay') {
      if (avgStay) {
        priorDate = avgStay.date_start
        toDate = avgStay.date_end
        avgDays = (Math.ceil(Math.abs(new Date(priorDate) - new Date(toDate)) / (1000 * 60 * 60 * 24))) + 1
        showAvgDays = true
      }
      inputAvgTh = (
        <th>Stay</th>
      )
      inputAvgTd = (
        <td>
          <Form>
            <FormGroup>
              <Select
                id="avg-stay-spend"
                name="stay_id"
                className="basic-single"
                classNamePrefix="select"
                defaultValue={avgStay}
                onChange={this.handleStaySelect}
                isLoading={false}
                isClearable={true}
                isSearchable={true}
                options={this.state.stayList}
                getOptionLabel={x => x.display_name}
                getOptionValue={x => x.id}
              />
            </FormGroup>
          </Form>
        </td>
      )
    }

    const budgetDays = Math.ceil(Math.abs(new Date(budgetStartDate) - new Date(budgetEndDate)) / (1000 * 60 * 60 * 24))
    var budgetNowToEndDays = (Math.ceil(Math.abs(new Date() - new Date(budgetEndDate)) / (1000 * 60 * 60 * 24)))
    const totalBudget = budgetDays * totalDailyBudget
    var disabledFxSelection = false
    if (budgetEndDate <= nowDate) {
      disabledFxSelection = true
      budgetNowToEndDays = 0
      checkedFxSelection = false
    }

    const expenseSpendAvgSubset = expenseData.filter(
      x => x.date >= priorDate &&
        x.date <= toDate &&
        !x.stay_id &&
        !x.spread_over &&
        !x.ignore
    );
    const expenseSpendSubset = expenseItemData.filter(
      x => x.date >= budgetStartDate &&
        x.date <= budgetEndDate
    );
    const planSpendSubset = planItemData.filter(
      x => x.date >= budgetStartDate &&
        x.date <= budgetEndDate
    );
    const totalSpendAvgAmount = expenseSpendAvgSubset.reduce((accumulator, object) => {
      return accumulator + object.amount;
    }, 0)
    var avgDailySpend = totalSpendAvgAmount / avgDays
    if (defaultAvgOption.value === 'manual') {
      avgDailySpend = this.state.avgManualDailySpend

    }
    var forecastSpend = 0
    if (checkedFxSelection) {
      forecastSpend = (avgDailySpend * budgetNowToEndDays)
    }
    const totalSpendAmount = (
      expenseSpendSubset.reduce((accumulator, object) => {
        return accumulator + object.amount;
      }, 0) + planSpendSubset.reduce((accumulator, object) => {
        return accumulator + object.amount;
      }, 0)
    )
    var dailySpendTarget = 0
    if (budgetNowToEndDays > 0) {
      dailySpendTarget = (totalBudget - totalSpendAmount) / budgetNowToEndDays
    }
    const totalSpendAmountInclFx = totalSpendAmount + forecastSpend
    const spendBudgetDiff = totalSpendAmountInclFx - totalBudget
    const spendBudgetDiffPerc = Math.round((spendBudgetDiff / totalBudget) * 100)

    const avgOptions = [
      { value: 'days', label: '# of Days', name: 'defaultAvgOption' },
      { value: 'setDates', label: 'Set Dates', name: 'defaultAvgOption' },
      { value: 'stay', label: 'Based on Stay', name: 'defaultAvgOption' },
      { value: 'manual', label: 'Manual', name: 'defaultAvgOption' },
    ]

    var spendTotalAvgTh = (
      <>
      </>
    )
    if (defaultAvgOption.value !== 'manual') {
      if (defaultAvgOption.value === 'days') {
        spendTotalAvgTh = (<th>Spend from {priorDate} to {toDate}</th>)
      } else {
        spendTotalAvgTh = (<th>Spend</th>)
      }
    }

    return (
      <div className="row">
        <div className="col-12 mx-auto p-0 text-center">
          <table class="table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Incl. Daily Exp. FX</th>
                <th>Budget</th>
                {checkedFxSelection ? <th>FX Exp.</th> : null}
                <th>Expenditure</th>
                <th>Variance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <Form>
                    <FormGroup>
                      <Input
                        type="date"
                        id="start-Date"
                        name="budgetStartDate"
                        style={{
                          textAlign: "center",
                        }}
                        value={this.state.budgetStartDate}
                        onChange={this.handleKeyMetricChange}
                      />
                    </FormGroup>
                  </Form>
                </td>
                <td>
                  <Form>
                    <FormGroup>
                      <Input
                        type="date"
                        id="end-Date"
                        name="budgetEndDate"
                        style={{
                          textAlign: "center",
                        }}
                        value={this.state.budgetEndDate}
                        onChange={this.handleKeyMetricChange}
                      />
                    </FormGroup>
                  </Form>
                </td>
                <td>
                  {budgetDays}
                </td>
                <td>
                  <div class="form-check form-switch">
                    <input name="includeAvgDailySpendForecast" onChange={this.handleKeyMetricChange} disabled={disabledFxSelection} checked={checkedFxSelection} class="form-check-input" type="checkbox" id="inclFxForecastInKeyMetrics" />
                    <label>{budgetNowToEndDays} Days</label>
                  </div>
                </td>
                <td>
                  {formatter.format(totalBudget)}
                </td>
                {checkedFxSelection ?
                  <td>
                    {formatter.format(forecastSpend)}
                  </td>
                  : null}
                <td>
                  {formatter.format(totalSpendAmountInclFx)}
                </td>

                <td>
                  {formatter.format(spendBudgetDiff)} ({spendBudgetDiffPerc}%)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="row">
          <div className="col-12 mx-auto p-0 text-center">
            <table class="table">
              <thead>
                <tr>
                  <th>Type</th>
                  {inputAvgTh}
                  {showAvgDays ?
                    <th>Days</th>
                    : null}
                  {spendTotalAvgTh}
                  <th>Avg. Daily Spend</th>
                  {!disabledFxSelection ?
                    <th>Target Daily Spend</th>
                    : null}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <FormGroup>
                      <Select
                        id="avg-type"
                        name="defaultAvgOption"
                        className="basic-single"
                        classNamePrefix="select"
                        defaultValue={defaultAvgOption}
                        onChange={this.handleKeyMetricSelectChange}
                        isLoading={false}
                        isClearable={false}
                        isSearchable={false}
                        options={avgOptions}
                        getOptionLabel={x => x.label}
                        getOptionValue={x => x.value}
                      />
                    </FormGroup>
                  </td>
                  {inputAvgTd}
                  {showAvgDays ?
                    <td>
                      {avgDays}
                    </td>
                    : null}
                  {defaultAvgOption.value === 'manual' ? null :
                    <td>
                      {formatter.format(totalSpendAvgAmount)}
                    </td>}
                  <td id="dailySpendComputation" value={avgDailySpend}>
                    {formatter.format(avgDailySpend)}
                  </td>
                  {!disabledFxSelection ?
                    < td >
                      {formatter.format(dailySpendTarget)}
                    </td>
                    : null}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div >
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
    ];
    var planColumns = [
      {
        Header: 'Description',
        accessor: 'display_name',
      },
      {
        Header: 'Amount',
        accessor: 'amount',
      },
    ];
    const planData = this.state.planList
    var stayColumns = [
      {
        Header: 'Stay',
        accessor: 'display_name',
      },
      {
        Header: 'State',
        accessor: 'state_name',
      },
      {
        Header: 'Country',
        accessor: 'country_name',
      },
    ];
    const stayData = this.state.stayList

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
          'data-tip': `${value.cityStay}<br/>${value.dateString}<br/>${value.message}`,
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
        {this.renderKeyMetrics()}
        <div className="row float-right">
          <div className="col-12 mx-auto p-0 ">
            <PlaidLink
              clientName="Nomad"
              env="production"
              product={["auth", "transactions"]}
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
        <ReactTooltip clickable={false} place="right" multiline={true} globalEventOff="click" />
        <Tabs
          id="dashboard-notebook"
          activeKey={this.state.viewNotebookState}
          onSelect={(k) => this.displayNotebookState(k)}
          className="mb-3"
        >
          <Tab eventKey="daily" title="Daily">
            <div className="mx-auto p-0" style={tableStyle}>
              <Table columns={dateColumns} data={dateData} defaultPage={defaultDatePage} onRowClicked={this.editStayFromDateTable} />
            </div>
            {this.state.hideFx ?
              <FontAwesomeIcon onClick={this.toggleHideFx} className="float-right hidespread" icon={faEyeSlash} />
              :
              <FontAwesomeIcon onClick={this.toggleHideFx} className="float-right hidespread" icon={faEye} />
            }

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
          <Tab eventKey="plannedExpenses" title="Planned Expenses">
            <Button
              className="btn btn-success float-left me-3"
              onClick={this.createPlan}
              style={actionButtonStyle}
            >
              Create Planned Expense
            </Button>
            <div className="mx-auto p-0" style={tableStyle}>
              <Table columns={planColumns} data={planData} defaultPage={0} onRowClicked={this.editPlanFromTable} />
            </div>

          </Tab>
          <Tab eventKey="stays" title="Stays">
            <Button
              className="btn btn-info float-left me-3"
              onClick={this.createStay}
              style={actionButtonStyle}
            >
              Add Stay
            </Button>
            <div className="mx-auto p-0" style={tableStyle}>
              <Table columns={stayColumns} data={stayData} defaultPage={0} onRowClicked={this.editStayFromTable} />
            </div>

          </Tab>
        </Tabs>
        <div className="row float-right">
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
              onDelete={this.handleModalDelete}
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