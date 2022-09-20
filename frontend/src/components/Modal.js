import React, { Component } from "react";
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Input,
  Label,
} from "reactstrap";
import Select from 'react-select'

export default class CustomModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeItem: this.props.activeItem,
      model_name: this.props.model_name,
      action_name: this.props.action_name,
      categoryList: this.props.categoryList,
    };
  }

  handleChange = (e) => {
    let { name, value } = e.target;

    if (e.target.type === "checkbox") {
      value = e.target.checked;
    }

    const activeItem = { ...this.state.activeItem, [name]: value };

    this.setState({ activeItem });
  };

  handleSelect = (e) => {
    let { id, name } = e;

    const activeItem = { ...this.state.activeItem, ['category_id']: id };

    this.setState({ activeItem });
  };

  render() {
    const { toggle, onSave } = this.props;
    var modal_title = this.state.model_name;
    var action_title = this.state.action_name;

    const isSearchable = true;
    const isClearable = true;
    const isLoading = false;

    const categoryList = this.state.categoryList;
    var defaultCategory = categoryList.filter((item) => item.id === this.state.activeItem.category_id);


    return (
      <Modal isOpen={true} toggle={toggle}>
        <ModalHeader toggle={toggle}>{action_title} {modal_title}</ModalHeader>
        <ModalBody>
          {(modal_title === 'Expense Category') ? (
            <Form>
              <FormGroup>
                <Label for="category-name">Name</Label>
                <Input
                  type="text"
                  id="category-name"
                  name="name"
                  value={this.state.activeItem.name}
                  onChange={this.handleChange}
                  placeholder="Enter expense category name..."
                />
              </FormGroup>
            </Form>
          ) : (
            <Form>
              <FormGroup>
                <Label for="expense-date">Date</Label>
                <Input
                  type="date"
                  id="expense-date"
                  name="date"
                  value={this.state.activeItem.date}
                  onChange={this.handleChange}
                />
              </FormGroup>

              <FormGroup>
                <Label for="expense-transactionId">Transaction ID</Label>
                <Input
                  type="text"
                  id="expense-transactionId"
                  name="transaction_id"
                  value={this.state.activeItem.transaction_id}
                  onChange={this.handleChange}
                  placeholder="Enter expense transaction id..."
                />
              </FormGroup>

              <FormGroup>
                <Label for="expense-name">Label</Label>
                <Input
                  type="text"
                  id="expense-name"
                  name="name"
                  value={this.state.activeItem.name}
                  onChange={this.handleChange}
                  placeholder="Enter expense name..."
                />
              </FormGroup>

              <FormGroup>
                <Label for="expense-category">Category</Label>
                <Select
                  id="expense-category"
                  name="category_id"
                  className="basic-single"
                  classNamePrefix="select"
                  defaultValue={defaultCategory}
                  onChange={this.handleSelect}
                  isLoading={isLoading}
                  isClearable={isClearable}
                  isSearchable={isSearchable}
                  options={categoryList}
                  getOptionLabel={x => x.name}
                  getOptionValue={x => x.id}
                />
              </FormGroup>

              <FormGroup>
                <Label for="expense-status">Status</Label>
                <select class="form-control"
                  id="expense-status"
                  name="state"
                  value={this.state.activeItem.state}
                  onChange={this.handleChange}>
                  <option value='pending'>Pending</option>
                  <option value='done'>Done</option>
                  <option value='ignore'>Ignore</option>
                </select>
              </FormGroup>

            </Form>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="success"
            onClick={() => onSave(this.state.activeItem)}
          >
            Save
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}