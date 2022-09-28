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

export default class TransactionSyncDateModal extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  handleChange = (e) => {
    let { name, value } = e.target;

    if (e.target.type === "checkbox") {
      value = e.target.checked;
    }

    const activeItem = { ...this.state.activeItem, [name]: value };

    this.setState({ activeItem });
  };

  render() {
    const { toggle, onSave } = this.props;

    const form = (
      <Form>

        <FormGroup>
          <Label for="stay-date-end">Date Start</Label>
          <Input
            type="date"
            id="sync-date-start"
            name="date_start"
            value={null}
            onChange={this.handleChange}
          />
        </FormGroup>

        <FormGroup>
          <Label for="stay-date-end">Date End</Label>
          <Input
            type="date"
            id="sync-date-end"
            name="date_end"
            value={null}
            onChange={this.handleChange}
          />
        </FormGroup>

      </Form>
    );

    return (
      <Modal isOpen={true} toggle={toggle}>
        <ModalHeader toggle={toggle}>Date Sync</ModalHeader>
        <ModalBody>
          {form}
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